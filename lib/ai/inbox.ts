/**
 * AI Inbox (master plan Phases 8, 9, 17, 18, 22, 23, 24): the creator's
 * trust center for the AI staff.
 *
 * The inbox reads the audit trail — `ai_actions` + `ai_action_reviews`
 * (ADR-002 §5) — there is no separate store. Human decisions work like
 * this:
 * - approve: records a human `approved` review, then EXECUTES the action
 *   NOW through the action's registry executor (the same step-7 logic as
 *   `verifyAndExecute`), and marks the row `executed`. A second approve is
 *   a no-op: the action is never re-executed.
 * - reject: records a human `rejected` review (with optional feedback) and
 *   marks the row `rejected`. Rejecting NEVER executes.
 *
 * Only `pending_approval` and `draft` rows are decidable; anything else
 * (executed, rejected, failed, blocked, …) returns its current state
 * untouched (idempotent).
 *
 * Storage is injected via the `InboxDb` interface (extends `VerifyDb`) so
 * unit tests run without a database. `supabaseInboxDb()` builds the real
 * adapter from env (service-role key); it throws AI_DB_UNAVAILABLE when
 * the env is missing. Server-side only — never import from client
 * components (use `inbox-display.ts` there).
 */
import { createClient } from '@supabase/supabase-js';

import { getAction, type ActionContext } from './actions';
import { AIAgentError } from './types';
import {
    supabaseVerifyDb,
    ActionRowError,
    type AIActionRow,
    type NewAIActionReviewRow,
    type VerifyDb,
} from './verify';

/** One row of `ai_action_reviews` (migration 20261015000002_ai_governance.sql). */
export interface AIActionReviewRow {
    id: string;
    actionId: string;
    reviewerType: 'ai' | 'human';
    reviewerId: string | null;
    decision: string;
    feedback: string | null;
    createdAt: string;
}

/** An `ai_actions` row with its reviews attached (what the inbox renders). */
export interface InboxActionItem extends AIActionRow {
    reviews: AIActionReviewRow[];
}

/** Statuses that await a human decision in the inbox. */
export const PENDING_STATUSES = ['pending_approval', 'draft'] as const;

/** Minimal storage surface the inbox needs (verify + inbox reads). */
export interface InboxDb extends VerifyDb {
    getActionById(id: string): Promise<AIActionRow | null>;
    listActionsByStatus(
        clubId: string,
        statuses: string[],
    ): Promise<AIActionRow[]>;
    listReviews(actionIds: string[]): Promise<AIActionReviewRow[]>;
}

export interface InboxDeps {
    db: InboxDb;
    now?: () => Date;
}

export type InboxErrorCode = 'NOT_FOUND';

export class InboxError extends Error {
    readonly code: InboxErrorCode;

    constructor(code: InboxErrorCode, message: string) {
        super(message);
        this.name = 'InboxError';
        this.code = code;
    }
}

export interface DecisionResult {
    actionId: string;
    status: string;
    /**
     * True when the action was already decided — no review was recorded,
     * nothing was executed or changed.
     */
    idempotent: boolean;
    /** Executor result (approve) or undefined. */
    result?: unknown;
    /** Failure/rejection reason, when one applies. */
    reason?: string;
}

function isDecidable(status: string): boolean {
    return (PENDING_STATUSES as readonly string[]).includes(status);
}

async function withReviews(
    db: InboxDb,
    rows: AIActionRow[],
): Promise<InboxActionItem[]> {
    if (rows.length === 0) return [];
    const reviews = await db.listReviews(rows.map((r) => r.id));
    const byAction = new Map<string, AIActionReviewRow[]>();
    for (const review of reviews) {
        const list = byAction.get(review.actionId);
        if (list) list.push(review);
        else byAction.set(review.actionId, [review]);
    }
    return rows.map((row) => ({
        ...row,
        reviews: byAction.get(row.id) ?? [],
    }));
}

export interface ListInboxOptions {
    /** Defaults to the pending statuses (draft + pending_approval). */
    statuses?: string[];
    /**
     * Keep only actions that carry a human review with this decision —
     * backs the "Aprobadas"/"Rechazadas" tabs.
     */
    humanDecision?: 'approved' | 'rejected';
    /** Max rows; defaults to 100. */
    limit?: number;
}

/**
 * List inbox actions for a club, newest first, with their reviews.
 * Authorization (owner/admin/moderator) is the caller's job — see the
 * API routes.
 */
export async function listInboxActions(
    clubId: string,
    deps: InboxDeps,
    opts: ListInboxOptions = {},
): Promise<InboxActionItem[]> {
    const statuses = opts.statuses ?? [...PENDING_STATUSES];
    const limit = opts.limit ?? 100;
    const rows = await deps.db.listActionsByStatus(clubId, statuses);
    const items = await withReviews(deps.db, rows.slice(0, limit));
    if (!opts.humanDecision) return items;
    return items.filter((item) =>
        item.reviews.some(
            (r) =>
                r.reviewerType === 'human' &&
                r.decision === opts.humanDecision,
        ),
    );
}

/** Pending drafts: the inbox's default view. */
export async function getPendingActions(
    clubId: string,
    deps: InboxDeps,
): Promise<InboxActionItem[]> {
    return listInboxActions(clubId, deps, { statuses: [...PENDING_STATUSES] });
}

/** Pending count for the sidebar badge. */
export async function countPendingActions(
    clubId: string,
    deps: InboxDeps,
): Promise<number> {
    const rows = await deps.db.listActionsByStatus(clubId, [
        ...PENDING_STATUSES,
    ]);
    return rows.length;
}

/** One action with its reviews, or null. */
export async function getInboxAction(
    actionId: string,
    deps: InboxDeps,
): Promise<InboxActionItem | null> {
    const row = await deps.db.getActionById(actionId);
    if (!row) return null;
    const [item] = await withReviews(deps.db, [row]);
    return item;
}

/**
 * Approve a pending action: record the human review, then EXECUTE the
 * action now through its registry executor (same step-7 logic as
 * `verifyAndExecute`) and mark the row `executed`.
 *
 * Idempotent: approving an already-decided action returns its current
 * state without executing or recording anything.
 */
export async function approveAction(
    actionId: string,
    reviewerId: string,
    deps: InboxDeps,
    feedback?: string,
): Promise<DecisionResult> {
    const db = deps.db;
    const now = deps.now ?? (() => new Date());

    const row = await db.getActionById(actionId);
    if (!row) {
        throw new InboxError('NOT_FOUND', `AI action "${actionId}" not found`);
    }
    if (!isDecidable(row.status)) {
        return {
            actionId: row.id,
            status: row.status,
            idempotent: true,
            result: asResult(row.executionResult),
        };
    }

    // Record the human decision first — the audit trail is append-only.
    const review: NewAIActionReviewRow = {
        actionId: row.id,
        reviewerType: 'human',
        reviewerId,
        decision: 'approved',
        feedback: feedback ?? null,
    };
    await db.insertReview(review);

    // Execute NOW via the action's executor (verify.ts step-7 logic).
    let def;
    try {
        def = getAction(row.action);
    } catch {
        const reason = `unknown action "${row.action}" at approval time (deny by default)`;
        await db.updateAction(row.id, {
            status: 'failed',
            executionResult: { reason, approvedBy: reviewerId },
        });
        return {
            actionId: row.id,
            status: 'failed',
            idempotent: false,
            reason,
        };
    }

    const actionCtx: ActionContext = {
        clubId: row.clubId,
        agentId: row.agentId,
        action: row.action,
        idempotencyKey: row.idempotencyKey,
        db,
        now,
        policyResult: row.policyResult,
        reviewResult: row.reviewResult,
        auditRowId: row.id,
    };
    try {
        const execResult = await def.execute(row.inputs, actionCtx);
        // Deterministic check, same as the pipeline: the executor's result
        // must satisfy its output schema.
        const outParsed = def.outputSchema.safeParse(execResult);
        if (!outParsed.success) {
            throw new Error(
                'executor returned a result that fails its output schema',
            );
        }
        // Self-auditing executors (escalate_to_human, notify_creator) update
        // the pre-inserted row and return its id.
        const targetRowId = execResult.auditRowId ?? row.id;
        await db.updateAction(targetRowId, {
            status: 'executed',
            executionResult: {
                result: execResult,
                approvedBy: reviewerId,
                approvedAt: now().toISOString(),
            },
        });
        return {
            actionId: targetRowId,
            status: 'executed',
            idempotent: false,
            result: execResult.data ?? execResult,
        };
    } catch (err) {
        const reason = err instanceof Error ? err.message : String(err);
        // Self-auditing executors may have already written their row.
        const failedRowId =
            err instanceof ActionRowError ? err.auditRowId : row.id;
        await db.updateAction(failedRowId, {
            status: 'failed',
            executionResult: {
                reason,
                approvedBy: reviewerId,
                approvedAt: now().toISOString(),
            },
        });
        return { actionId: failedRowId, status: 'failed', idempotent: false, reason };
    }
}

/**
 * Reject a pending action: record the human review (with optional
 * feedback) and mark the row `rejected`. Rejecting NEVER executes.
 *
 * Idempotent: rejecting an already-decided action returns its current
 * state without recording anything.
 */
export async function rejectAction(
    actionId: string,
    reviewerId: string,
    deps: InboxDeps,
    feedback?: string,
): Promise<DecisionResult> {
    const db = deps.db;
    const now = deps.now ?? (() => new Date());

    const row = await db.getActionById(actionId);
    if (!row) {
        throw new InboxError('NOT_FOUND', `AI action "${actionId}" not found`);
    }
    if (!isDecidable(row.status)) {
        return { actionId: row.id, status: row.status, idempotent: true };
    }

    const reason =
        feedback && feedback.trim().length > 0
            ? feedback
            : 'rejected by human reviewer';
    await db.insertReview({
        actionId: row.id,
        reviewerType: 'human',
        reviewerId,
        decision: 'rejected',
        feedback: feedback ?? null,
    });
    // The row is marked rejected WITHOUT executing — the executor is never called.
    await db.updateAction(row.id, {
        status: 'rejected',
        executionResult: {
            reason,
            rejectedBy: reviewerId,
            rejectedAt: now().toISOString(),
        },
    });
    return {
        actionId: row.id,
        status: 'rejected',
        idempotent: false,
        reason,
    };
}

/** Extract a prior execution result from an audit row (idempotent replays). */
function asResult(executionResult: unknown): unknown {
    if (executionResult && typeof executionResult === 'object') {
        return (executionResult as { result?: unknown }).result;
    }
    return undefined;
}

/**
 * Real InboxDb backed by Supabase (service-role). Reuses
 * `supabaseVerifyDb()` for the pipeline's storage surface and adds the
 * inbox's read methods. Throws AI_DB_UNAVAILABLE when the Supabase env
 * vars are missing.
 */
export function supabaseInboxDb(): InboxDb {
    const base = supabaseVerifyDb();
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
        ...base,
        async getActionById(id: string) {
            const { data, error } = await supabase
                .from('ai_actions')
                .select('*')
                .eq('id', id)
                .maybeSingle();
            if (error) throw unavailable('read ai_actions', error.message);
            if (!data) return null;
            return fromActionDbRow(data);
        },
        async listActionsByStatus(clubId: string, statuses: string[]) {
            const { data, error } = await supabase
                .from('ai_actions')
                .select('*')
                .eq('club_id', clubId)
                .in('status', statuses)
                .order('created_at', { ascending: false });
            if (error) throw unavailable('list ai_actions', error.message);
            return (data ?? []).map(fromActionDbRow);
        },
        async listReviews(actionIds: string[]) {
            const { data, error } = await supabase
                .from('ai_action_reviews')
                .select('*')
                .in('action_id', actionIds)
                .order('created_at', { ascending: true });
            if (error) throw unavailable('list ai_action_reviews', error.message);
            return (data ?? []).map(fromReviewDbRow);
        },
    };
}

type DbRow = Record<string, unknown>;

function fromActionDbRow(data: DbRow): AIActionRow {
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

function fromReviewDbRow(data: DbRow): AIActionReviewRow {
    return {
        id: data.id as string,
        actionId: data.action_id as string,
        reviewerType: data.reviewer_type as 'ai' | 'human',
        reviewerId: (data.reviewer_id as string | null) ?? null,
        decision: data.decision as string,
        feedback: (data.feedback as string | null) ?? null,
        createdAt: data.created_at as string,
    };
}
