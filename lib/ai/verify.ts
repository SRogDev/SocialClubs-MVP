/**
 * AI action verification pipeline (ADR-002 §3, master plan Phase 15).
 *
 * Every agent-proposed action flows through `verifyAndExecute`:
 *   1. idempotency check (duplicate key -> original result, never re-executes)
 *   2. schema validation (deterministic)
 *   3. permission validation: the agent must hold every permission the
 *      action requires (deterministic)
 *   4. policy evaluation (policy.ts): club config -> mode
 *   5. draft mode -> store the draft for the AI Inbox, never execute
 *   6. medium+ risk -> AI reviewer via runtime.invokeAgent (reviewer tier,
 *      max 1 revise loop, then escalate)
 *   7. high/critical risk or approval mode -> pending row for human approval
 *   8. execute via the action's executor
 *   9. write the `ai_actions` audit row
 *
 * Deterministic checks are plain code — never ask the LLM what code can
 * decide. The reviewer is fail-safe: if it is unavailable, the action
 * escalates to a human instead of executing blind.
 *
 * Storage is injected via the `VerifyDb` interface so unit tests run
 * without a database. `supabaseVerifyDb()` builds the real adapter from
 * env (service-role key); it throws AI_DB_UNAVAILABLE when the env is
 * missing. Server-side only — never import from client components.
 */
import { createHash } from 'node:crypto';

import { createClient } from '@supabase/supabase-js';

import { getAction, type ActionContext, type ActionDef, type ActionResult } from './actions';
import { REVIEWER_DEFINITION, type ReviewOutput } from './agents';
import type { CostDeps } from './cost';
import { evaluatePolicy, type ClubAIConfigRow, type PolicyDb, type PolicyResult } from './policy';
import type { ActionMode } from './proactivity';
import { invokeAgent, type InvokeDeps } from './runtime';
import {
    AIAgentError,
    type AIClient,
    type AgentDefinition,
} from './types';

/** One row of `ai_actions` (migration 20261015000002_ai_governance.sql). */
export interface NewAIActionRow {
    clubId: string;
    agentId: string;
    action: string;
    inputs: unknown;
    idempotencyKey: string;
    status: string;
    policyResult?: unknown;
    reviewResult?: unknown;
    executionResult?: unknown;
}

export interface AIActionRow extends NewAIActionRow {
    id: string;
    createdAt: string;
}

/** One row of `ai_action_reviews`. */
export interface NewAIActionReviewRow {
    actionId: string;
    reviewerType: 'ai' | 'human';
    reviewerId?: string | null;
    decision: string;
    feedback?: string | null;
}

/** Minimal storage surface the verification pipeline needs. */
export interface VerifyDb extends PolicyDb {
    findActionByIdempotencyKey(key: string): Promise<AIActionRow | null>;
    insertAction(row: NewAIActionRow): Promise<AIActionRow>;
    updateAction(id: string, patch: Partial<NewAIActionRow>): Promise<void>;
    insertReview(row: NewAIActionReviewRow): Promise<void>;
}

export type VerifyStatus =
    | 'draft'
    | 'pending_approval'
    | 'executed'
    | 'failed'
    | 'blocked'
    | 'rejected';

export interface VerifyResult {
    status: VerifyStatus;
    actionId?: string;
    mode?: ActionMode;
    result?: unknown;
    draft?: unknown;
    reason?: string;
}

export interface VerifyContext {
    clubId: string;
    idempotencyKey?: string;
}

export interface VerifyDeps {
    db: VerifyDb;
    /** Injected reviewer client (tests). Defaults to AIsa-or-mock selection. */
    client?: AIClient;
    /** Injected cost storage for the reviewer call (tests). */
    cost?: CostDeps;
    now?: () => Date;
}

export interface VerifyRequest {
    agentDef: AgentDefinition;
    action: string;
    inputs: unknown;
    ctx: VerifyContext;
    deps: VerifyDeps;
}

type ReviewOutcome =
    | { outcome: 'pass'; inputs: unknown; reviews: ReviewOutput[] }
    | { outcome: 'escalate'; reviews: ReviewOutput[]; reason: string }
    | { outcome: 'blocked'; reviews: ReviewOutput[]; reason: string };

function isUniqueViolation(err: unknown): boolean {
    return (
        typeof err === 'object' &&
        err !== null &&
        (err as { code?: unknown }).code === '23505'
    );
}

/** Deterministic default idempotency key from the action's identity + inputs. */
function defaultIdempotencyKey(
    clubId: string,
    agentId: string,
    action: string,
    inputs: unknown,
): string {
    const digest = createHash('sha256')
        .update(stableStringify(inputs))
        .digest('hex')
        .slice(0, 16);
    return `ai:${clubId}:${agentId}:${action}:${digest}`;
}

function stableStringify(value: unknown): string {
    if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
    if (typeof value === 'object' && value !== null) {
        const entries = Object.entries(value as Record<string, unknown>)
            .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
            .map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`);
        return `{${entries.join(',')}}`;
    }
    return JSON.stringify(value) ?? 'null';
}

function baseRow(
    req: VerifyRequest,
    idempotencyKey: string,
    inputs: unknown,
): NewAIActionRow {
    return {
        clubId: req.ctx.clubId,
        agentId: req.agentDef.id,
        action: req.action,
        inputs,
        idempotencyKey,
        status: 'running',
    };
}

function fromExistingRow(row: AIActionRow, note: string): VerifyResult {
    return {
        status: row.status as VerifyStatus,
        actionId: row.id,
        result: (row.executionResult as { result?: unknown } | undefined)?.result,
        draft:
            row.status === 'draft'
                ? (row.executionResult as { draft?: unknown } | undefined)?.draft
                : undefined,
        reason: note,
    };
}

/**
 * AI review pass (ADR-002 §3): separate reviewer-tier call with the action
 * + context. Max 1 revise loop, then escalate. Fail-safe: a reviewer
 * failure escalates to a human rather than executing blind.
 */
async function runReview(
    req: VerifyRequest,
    def: ActionDef,
    validatedInputs: unknown,
    actionRowId: string,
    idempotencyKey: string,
): Promise<ReviewOutcome> {
    const { agentDef, ctx, deps } = req;
    const db = deps.db;
    const invokeDeps: InvokeDeps = {};
    if (deps.client) invokeDeps.client = deps.client;
    if (deps.cost) invokeDeps.cost = deps.cost;
    if (deps.now) invokeDeps.now = deps.now;

    const reviews: ReviewOutput[] = [];
    let currentInputs = validatedInputs;

    for (let attempt = 0; attempt < 2; attempt++) {
        let output: ReviewOutput;
        try {
            const res = await invokeAgent<ReviewOutput>(
                REVIEWER_DEFINITION,
                {
                    type: 'action-review',
                    clubId: ctx.clubId,
                    memberId: agentDef.id,
                    payload: {
                        agentId: agentDef.id,
                        action: req.action,
                        risk: def.risk,
                        inputs: currentInputs,
                        idempotencyKey,
                        attempt: attempt + 1,
                    },
                },
                invokeDeps,
            );
            output = res.output;
        } catch (err) {
            // Fail-safe: reviewer unavailable -> human decides.
            return {
                outcome: 'escalate',
                reviews,
                reason: `AI reviewer unavailable (${err instanceof Error ? err.message : String(err)}); escalated to human`,
            };
        }

        reviews.push(output);
        await db.insertReview({
            actionId: actionRowId,
            reviewerType: 'ai',
            decision: output.decision,
            feedback: output.feedback,
        });

        if (output.decision === 'pass') {
            return { outcome: 'pass', inputs: currentInputs, reviews };
        }
        if (output.decision === 'block') {
            return {
                outcome: 'blocked',
                reviews,
                reason: `AI reviewer blocked the action: ${output.feedback}`,
            };
        }
        if (output.decision === 'revise' && attempt === 0) {
            const merged = { ...(currentInputs as Record<string, unknown>), ...(output.revisedInputs ?? {}) };
            const revalidated = def.inputSchema.safeParse(merged);
            if (!revalidated.success) {
                return {
                    outcome: 'escalate',
                    reviews,
                    reason: 'AI reviewer proposed invalid revised inputs; escalated to human',
                };
            }
            currentInputs = revalidated.data;
            continue;
        }
        // 'escalate', or a second non-pass decision: human decides.
        return {
            outcome: 'escalate',
            reviews,
            reason: `AI reviewer ${output.decision === 'revise' ? 'did not pass after 1 revise loop' : 'escalated'}: ${output.feedback}`,
        };
    }
    // Unreachable (loop always returns), but TypeScript needs the fallthrough.
    return { outcome: 'escalate', reviews, reason: 'review loop exhausted; escalated to human' };
}

export async function verifyAndExecute(req: VerifyRequest): Promise<VerifyResult> {
    const { agentDef, action, inputs, ctx, deps } = req;
    const db = deps.db;
    const now = deps.now ?? (() => new Date());
    const idempotencyKey =
        ctx.idempotencyKey ?? defaultIdempotencyKey(ctx.clubId, agentDef.id, action, inputs);

    // (0) Idempotency: a duplicate key returns the original result, never re-executes.
    const existing = await db.findActionByIdempotencyKey(idempotencyKey);
    if (existing) {
        return fromExistingRow(existing, 'duplicate idempotency key: returning original result');
    }

    // Unknown action: reject (deny by default). Nothing to audit against a schema.
    let def: ActionDef;
    try {
        def = getAction(action);
    } catch {
        return { status: 'rejected', reason: `unknown action "${action}" (deny by default)` };
    }

    // (1) Schema validation — deterministic.
    const parsed = def.inputSchema.safeParse(inputs);
    if (!parsed.success) {
        const issues = parsed.error.issues
            .map((issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`)
            .join('; ');
        const reason = `input schema validation failed: ${issues}`;
        const row = await db.insertAction({
            ...baseRow(req, idempotencyKey, inputs),
            status: 'failed',
            executionResult: { reason },
        });
        return { status: 'failed', actionId: row.id, reason };
    }

    // (2) Permission validation — deterministic: the agent must hold every
    // permission the action requires.
    const missing = def.permissions.filter((p) => !agentDef.permissions.includes(p));
    if (missing.length > 0) {
        const reason = `agent "${agentDef.id}" lacks required permission(s): ${missing.join(', ')}`;
        const row = await db.insertAction({
            ...baseRow(req, idempotencyKey, parsed.data),
            status: 'blocked',
            executionResult: { reason },
        });
        return { status: 'blocked', actionId: row.id, reason };
    }

    // (3) Policy evaluation.
    const policy: PolicyResult = await evaluatePolicy(
        { clubId: ctx.clubId, agentId: agentDef.id, action },
        { db },
    );
    if (!policy.allowed) {
        const row = await db.insertAction({
            ...baseRow(req, idempotencyKey, parsed.data),
            status: 'blocked',
            policyResult: policy,
            executionResult: { reason: policy.reason },
        });
        return { status: 'blocked', actionId: row.id, reason: policy.reason };
    }

    // (4) Draft mode: store the draft for the AI Inbox; never execute, never review.
    if (policy.mode === 'draft') {
        const row = await db.insertAction({
            ...baseRow(req, idempotencyKey, parsed.data),
            status: 'draft',
            policyResult: policy,
            executionResult: { draft: parsed.data },
        });
        return { status: 'draft', actionId: row.id, mode: 'draft', draft: parsed.data };
    }

    // Insert the audit row before review/execution so AI reviews have an actionId.
    // Self-auditing executors (escalate_to_human, notify_creator) write their
    // own row and return its id — unless a review needs the id up front, in
    // which case the executor updates the pre-inserted row instead.
    // A 23505 here means a concurrent duplicate won the race: return its result.
    const needsPreInsert = !def.selfAuditing || policy.requiresReview;
    let row: AIActionRow | null = null;
    if (needsPreInsert) {
        try {
            row = await db.insertAction({
                ...baseRow(req, idempotencyKey, parsed.data),
                status: policy.requiresReview ? 'reviewing' : 'running',
                policyResult: policy,
            });
        } catch (err) {
            if (isUniqueViolation(err)) {
                const dup = await db.findActionByIdempotencyKey(idempotencyKey);
                if (dup) return fromExistingRow(dup, 'duplicate idempotency key (race): returning original result');
            }
            throw err;
        }
    }

    // (5) AI review for medium+ risk.
    let currentInputs: unknown = parsed.data;
    let reviewResult: unknown = null;
    if (policy.requiresReview) {
        if (!row) {
            throw new Error('internal error: review requires a pre-inserted audit row');
        }
        const reviewRowId = row.id;
        const review = await runReview(req, def, parsed.data, reviewRowId, idempotencyKey);
        reviewResult = { reviews: review.reviews };
        if (review.outcome === 'blocked') {
            await db.updateAction(reviewRowId, {
                status: 'blocked',
                reviewResult,
                executionResult: { reason: review.reason },
            });
            return { status: 'blocked', actionId: reviewRowId, mode: policy.mode, reason: review.reason };
        }
        if (review.outcome === 'escalate') {
            await db.updateAction(reviewRowId, {
                status: 'pending_approval',
                reviewResult,
                executionResult: { reason: review.reason },
            });
            return {
                status: 'pending_approval',
                actionId: reviewRowId,
                mode: policy.mode,
                reason: review.reason,
            };
        }
        currentInputs = review.inputs;
    }

    // (6) Human approval gate: high/critical risk, or approval mode.
    if (policy.mode === 'approval' || def.risk === 'high' || def.risk === 'critical') {
        // Unreachable when row is null: a null row implies low risk + auto mode.
        if (!row) {
            throw new Error('internal error: approval gate requires an audit row');
        }
        await db.updateAction(row.id, {
            status: 'pending_approval',
            reviewResult,
            executionResult: { inputs: currentInputs },
        });
        return {
            status: 'pending_approval',
            actionId: row.id,
            mode: policy.mode,
            reason: 'awaiting human approval in the AI Inbox',
        };
    }

    // (7) Execute via the action's executor.
    const actionCtx: ActionContext = {
        clubId: ctx.clubId,
        agentId: agentDef.id,
        action,
        idempotencyKey,
        db,
        now,
        policyResult: policy,
        reviewResult,
        auditRowId: row?.id,
    };
    try {
        const execResult: ActionResult = await def.execute(currentInputs, actionCtx);
        // Deterministic check: the executor's result must satisfy its output schema.
        const outParsed = def.outputSchema.safeParse(execResult);
        if (!outParsed.success) {
            throw new Error('executor returned a result that fails its output schema');
        }
        // Self-auditing executors (escalate_to_human, notify_creator) wrote
        // their own ai_actions row; the pipeline updates it instead of
        // inserting a duplicate.
        const targetRowId = execResult.auditRowId ?? row?.id;
        if (!targetRowId) {
            throw new Error('internal error: execution produced no audit row');
        }
        await db.updateAction(targetRowId, {
            status: 'executed',
            reviewResult,
            executionResult: { result: execResult },
        });
        return {
            status: 'executed',
            actionId: targetRowId,
            mode: policy.mode,
            result: execResult.data ?? execResult,
        };
    } catch (err) {
        if (isUniqueViolation(err)) {
            const dup = await db.findActionByIdempotencyKey(idempotencyKey);
            if (dup) return fromExistingRow(dup, 'duplicate idempotency key (race): returning original result');
        }
        const reason = err instanceof Error ? err.message : String(err);
        // Self-auditing executors may have already written their row.
        const failedRowId =
            err instanceof ActionRowError ? err.auditRowId : row?.id;
        if (!failedRowId) {
            throw new Error(`internal error: failed action has no audit row (${reason})`);
        }
        await db.updateAction(failedRowId, {
            status: 'failed',
            reviewResult,
            executionResult: { reason },
        });
        return { status: 'failed', actionId: failedRowId, mode: policy.mode, reason };
    }
}

/**
 * Typed error an executor may throw when it already wrote its own
 * `ai_actions` row before failing, so the pipeline updates that row
 * instead of the pipeline-created one.
 */
export class ActionRowError extends Error {
    readonly auditRowId: string;

    constructor(auditRowId: string, message: string) {
        super(message);
        this.name = 'ActionRowError';
        this.auditRowId = auditRowId;
    }
}

/**
 * Real VerifyDb backed by Supabase (service-role). Throws AI_DB_UNAVAILABLE
 * when SUPABASE env vars are missing.
 */
export function supabaseVerifyDb(): VerifyDb {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !serviceKey) {
        throw new AIAgentError(
            'AI_DB_UNAVAILABLE',
            'Supabase env (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY) is not configured.',
        );
    }
    const supabase = createClient(url, serviceKey);
    const unavailable = (op: string, message: string) =>
        new AIAgentError('AI_DB_UNAVAILABLE', `Failed to ${op}: ${message}`);

    return {
        async getClubAIConfig(clubId: string): Promise<ClubAIConfigRow | null> {
            const { data, error } = await supabase
                .from('club_ai_config')
                .select('*')
                .eq('club_id', clubId)
                .maybeSingle();
            if (error) throw unavailable('read club_ai_config', error.message);
            if (!data) return null;
            return {
                clubId: data.club_id,
                proactivityLevel: data.proactivity_level,
                enabledAgents: data.enabled_agents,
                tone: data.tone,
                policies: data.policies,
                updatedAt: data.updated_at,
            };
        },
        async findActionByIdempotencyKey(key: string): Promise<AIActionRow | null> {
            const { data, error } = await supabase
                .from('ai_actions')
                .select('*')
                .eq('idempotency_key', key)
                .maybeSingle();
            if (error) throw unavailable('read ai_actions', error.message);
            if (!data) return null;
            return fromDbRow(data);
        },
        async insertAction(row: NewAIActionRow): Promise<AIActionRow> {
            const { data, error } = await supabase
                .from('ai_actions')
                .insert(toDbRow(row))
                .select()
                .single();
            if (error) {
                // Preserve the Postgres unique-violation code for idempotency races.
                const err = unavailable('insert ai_actions', error.message) as AIAgentError & {
                    code: string;
                };
                if (error.code === '23505') (err as { code?: string }).code = '23505';
                throw err;
            }
            return fromDbRow(data);
        },
        async updateAction(id: string, patch: Partial<NewAIActionRow>): Promise<void> {
            const { error } = await supabase.from('ai_actions').update(toDbRow(patch)).eq('id', id);
            if (error) throw unavailable('update ai_actions', error.message);
        },
        async insertReview(row: NewAIActionReviewRow): Promise<void> {
            const { error } = await supabase.from('ai_action_reviews').insert({
                action_id: row.actionId,
                reviewer_type: row.reviewerType,
                reviewer_id: row.reviewerId ?? null,
                decision: row.decision,
                feedback: row.feedback ?? null,
            });
            if (error) throw unavailable('insert ai_action_reviews', error.message);
        },
    };
}

type DbRow = Record<string, unknown>;

function toDbRow(row: Partial<NewAIActionRow>): DbRow {
    const out: DbRow = {};
    if (row.clubId !== undefined) out.club_id = row.clubId;
    if (row.agentId !== undefined) out.agent_id = row.agentId;
    if (row.action !== undefined) out.action = row.action;
    if (row.inputs !== undefined) out.inputs = row.inputs;
    if (row.idempotencyKey !== undefined) out.idempotency_key = row.idempotencyKey;
    if (row.status !== undefined) out.status = row.status;
    if (row.policyResult !== undefined) out.policy_result = row.policyResult;
    if (row.reviewResult !== undefined) out.review_result = row.reviewResult;
    if (row.executionResult !== undefined) out.execution_result = row.executionResult;
    return out;
}

function fromDbRow(data: DbRow): AIActionRow {
    return {
        id: data.id as string,
        clubId: data.club_id as string,
        agentId: data.agent_id as string,
        action: data.action as string,
        inputs: data.inputs,
        idempotencyKey: data.idempotency_key as string,
        status: data.status as string,
        policyResult: data.policy_result,
        reviewResult: data.review_result,
        executionResult: data.execution_result,
        createdAt: data.created_at as string,
    };
}
