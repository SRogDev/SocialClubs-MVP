/**
 * AI agent runtime (ADR-001 §4): the ONLY sanctioned way to invoke an AI
 * staff agent. Agents never call the HTTP client directly.
 *
 * invokeAgent(def, signal):
 *   a) checks the feature flag for the agent (master + agent flag);
 *   b) enforces the club's monthly AI budget BEFORE calling the model;
 *   c) assembles the system prompt from def.mission + policies;
 *   d) calls the real AIsa client, or the deterministic mock when
 *      AISA_API_KEY is absent;
 *   e) validates the JSON output against def.outputSchema (zod);
 *   f) logs usage (tokens + estimated cost) to ai_usage;
 *   g) returns { output, trace }.
 *
 * All failures are typed AIAgentError codes — never silent, never raw.
 */
import { AISAClient } from './aisa-client';
import { checkBudget, logUsage, supabaseCostDb, type CostDeps } from './cost';
import { isAgentEnabled } from './flags';
import { MockAIClient } from './mock-client';
import { modelForTier } from './models';
import { estimateCostUsd } from './pricing';
import {
    AIAgentError,
    type AIClient,
    type AgentDefinition,
    type AISignal,
    type UsageSummary,
} from './types';

export interface InvokeTrace {
    latencyMs: number;
    model: string;
    tokens: UsageSummary;
    mock: boolean;
}

export interface InvokeResult<T> {
    output: T;
    trace: InvokeTrace;
}

export interface InvokeDeps {
    /** Injected client (tests). Defaults to AIsa-or-mock selection by env. */
    client?: AIClient;
    /** Injected cost storage (tests). Defaults to the Supabase adapter. */
    cost?: CostDeps;
    now?: () => Date;
}

function selectClient(): AIClient {
    if (process.env.AISA_API_KEY && process.env.AISA_API_KEY.trim().length > 0) {
        return new AISAClient();
    }
    return new MockAIClient();
}

function buildSystemPrompt(def: AgentDefinition): string {
    const lines: string[] = [
        `You are the ${def.role} of a SocialClubs club.`,
        '',
        `Mission: ${def.mission}`,
    ];
    if (def.policies.length > 0) {
        lines.push('', 'Policies (hard rules, always obey):');
        for (const policy of def.policies) lines.push(`- ${policy}`);
    }
    if (def.contextSources.length > 0) {
        lines.push('', `Available context sources: ${def.contextSources.join(', ')}.`);
    }
    if (def.tools.length > 0) {
        lines.push('', `Available tools: ${def.tools.join(', ')}.`);
    }
    lines.push('', 'Respond with a single JSON object matching the required schema. No prose.');
    return lines.join('\n');
}

/**
 * Resolve cost storage: explicit deps win; otherwise the Supabase adapter.
 * Without DB credentials the runtime only proceeds in mock mode (explicit
 * warning, trace.mock = true); real calls require the DB — budgets are a
 * hard requirement, not optional.
 */
function resolveCostDeps(client: AIClient, deps: InvokeDeps): CostDeps | undefined {
    if (deps.cost) return deps.cost;
    try {
        return { db: supabaseCostDb(), now: deps.now };
    } catch (err) {
        if (err instanceof AIAgentError && err.code === 'AI_DB_UNAVAILABLE' && client.mock) {
            console.warn(
                '[ai-runtime] Supabase not configured — usage will NOT be persisted (mock mode).',
            );
            return undefined;
        }
        throw err;
    }
}

export async function invokeAgent<T>(
    def: AgentDefinition,
    signal: AISignal,
    deps: InvokeDeps = {},
): Promise<InvokeResult<T>> {
    // (a) Feature flag: master + per-agent, both default OFF.
    if (!isAgentEnabled(def.id)) {
        throw new AIAgentError(
            'AI_FLAG_DISABLED',
            `AI agent "${def.id}" is disabled by feature flag.`,
        );
    }

    // (d) Client selection: real AIsa when a key exists, deterministic mock otherwise.
    const client = deps.client ?? selectClient();
    const costDeps = resolveCostDeps(client, deps);

    // (b) Budget enforcement happens BEFORE any model call.
    if (costDeps) {
        await checkBudget(signal.clubId, costDeps);
    }

    // (c) Assemble the prompt from the agent definition.
    const model = modelForTier(def.tier ?? 'fast');
    const systemPrompt = buildSystemPrompt(def);
    const userContent = JSON.stringify({
        signal: signal.type,
        clubId: signal.clubId,
        memberId: signal.memberId ?? null,
        idempotencyKey: signal.idempotencyKey ?? null,
        payload: signal.payload,
    });

    const startedAt = Date.now();
    const res = await client.chat({
        messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userContent },
        ],
        model,
        jsonMode: true,
        outputSchema: def.outputSchema,
    });
    const latencyMs = Date.now() - startedAt;

    // (e) Parse + validate. Non-JSON or schema-invalid output is a hard error.
    let parsedJson: unknown;
    try {
        parsedJson = JSON.parse(res.content) as unknown;
    } catch {
        throw new AIAgentError(
            'AI_OUTPUT_INVALID',
            `Agent "${def.id}" returned non-JSON output.`,
        );
    }
    const validated = def.outputSchema.safeParse(parsedJson);
    if (!validated.success) {
        const issues = validated.error.issues
            .map((issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`)
            .join('; ');
        throw new AIAgentError(
            'AI_OUTPUT_INVALID',
            `Agent "${def.id}" output failed schema validation: ${issues}`,
        );
    }

    // (f) Log usage: tokens + estimated cost, attributed to club/agent/workflow.
    const costUsd = estimateCostUsd(model, res.usage.promptTokens, res.usage.completionTokens);
    if (costDeps) {
        await logUsage(
            {
                clubId: signal.clubId,
                agentId: def.id,
                workflow: signal.type,
                model,
                promptTokens: res.usage.promptTokens,
                completionTokens: res.usage.completionTokens,
                costUsd,
                latencyMs,
                mock: client.mock,
            },
            costDeps,
        );
    }

    // (g) Return the validated output with its trace.
    return {
        output: validated.data as T,
        trace: {
            latencyMs,
            model,
            tokens: res.usage,
            mock: client.mock,
        },
    };
}
