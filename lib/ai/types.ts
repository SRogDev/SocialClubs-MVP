/**
 * Shared types for the SocialClubs AI runtime (ADR-001).
 *
 * Agent definitions live in code (not in the DB) for Phase 3.2; their
 * structured output contract is a zod schema so the runtime can validate
 * model responses deterministically.
 */
import type { z } from 'zod';

/** Cost/quality tier used for model routing (ADR-001, plan Phase 70). */
export type ModelTier = 'fast' | 'smart' | 'reviewer';

export type AIErrorCode =
    | 'AISA_NO_KEY'
    | 'AISA_UNREACHABLE'
    | 'AISA_AUTH'
    | 'AISA_RATE_LIMIT'
    | 'AI_BUDGET_EXCEEDED'
    | 'AI_FLAG_DISABLED'
    | 'AI_OUTPUT_INVALID'
    | 'AI_DB_UNAVAILABLE';

/** Typed error: every AI runtime failure carries a machine-readable code. */
export class AIAgentError extends Error {
    readonly code: AIErrorCode;

    constructor(code: AIErrorCode, message: string, options?: ErrorOptions) {
        super(message, options);
        this.name = 'AIAgentError';
        this.code = code;
    }
}

/**
 * Static definition of one AI staff agent. Agents never call the HTTP client
 * directly — they go through `invokeAgent` in runtime.ts.
 */
export interface AgentDefinition {
    /** Stable id, e.g. "community-manager". Maps to a feature flag (flags.ts). */
    id: string;
    /** Short human role label, e.g. "Community Manager". */
    role: string;
    /** What the agent is for — becomes the core of the system prompt. */
    mission: string;
    /** Named context sources the runtime may assemble (authorization-aware). */
    contextSources: string[];
    /** Tool names the agent is allowed to request via structured actions. */
    tools: string[];
    /** Permission strings the runtime checks deterministically. */
    permissions: string[];
    /** Event types that trigger this agent. */
    triggers: string[];
    /** Hard rules appended to the system prompt. */
    policies: string[];
    /** Zod schema the model's JSON output must satisfy. */
    outputSchema: z.ZodType<unknown>;
    /** Model tier; defaults to "fast" when omitted. */
    tier?: ModelTier;
}

/** Input event handed to an agent. */
export interface AISignal {
    type: string;
    clubId: string;
    memberId?: string;
    payload: Record<string, unknown>;
    idempotencyKey?: string;
}

/** A structured action an agent proposes (executed by the runtime, never the model). */
export interface AIAction {
    id: string;
    type: string;
    payload: Record<string, unknown>;
    idempotencyKey: string;
    requiresApproval: boolean;
}

/** Result of the deterministic verification pass over an agent's output. */
export interface VerificationResult {
    approved: boolean;
    reasons: string[];
}

/** One chat message in OpenAI-compatible format. */
export interface ChatMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

/** Token usage reported by the provider (or zeroed by the mock). */
export interface UsageSummary {
    promptTokens: number;
    completionTokens: number;
}

export interface AIClientRequest {
    messages: ChatMessage[];
    model: string;
    /** When true, the client asks the provider for a JSON object response. */
    jsonMode?: boolean;
    maxTokens?: number;
    /** Zod schema the mock uses to build its deterministic canned response. */
    outputSchema?: z.ZodType<unknown>;
}

export interface AIClientResponse {
    content: string;
    usage: UsageSummary;
}

/** Common interface for the real AIsa client and the deterministic mock. */
export interface AIClient {
    readonly mock: boolean;
    chat(req: AIClientRequest): Promise<AIClientResponse>;
}

/** One persisted usage record (table `ai_usage`). */
export interface CostRecord {
    clubId: string;
    agentId: string;
    workflow: string;
    model: string;
    promptTokens: number;
    completionTokens: number;
    costUsd: number;
    latencyMs: number;
    mock: boolean;
}
