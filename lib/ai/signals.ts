/**
 * AI signal/trigger layer (master plan Phase 19).
 *
 * Signals are durable, deduplicated event rows (`ai_signals` table) that
 * connect product events (a post was created, a member joined, a points
 * milestone was crossed) to the AI staff. Flow:
 *
 *   product code -> dispatchSignal()            (lib/ai/signal-dispatch.ts)
 *     -> emitSignal() persists the row, deduped  (this file)
 *     -> QStash POST /api/queues/ai-signals      (fire-and-forget)
 *   worker route loads the row, looks it up in SIGNAL_ROUTING,
 *     and runs the agent's chosen action through verifyAndExecute
 *     (lib/ai/verify.ts) — at proactivity L1 every action lands as a
 *     DRAFT for the AI Inbox; nothing is ever auto-sent from signals.
 *     `new_post` / `member_joined` skip the table: the worker calls the
 *     agent-composed drafts in lib/ai/agents/community-manager.ts
 *     (LLM-composed text, same governance pipeline).
 *
 * Storage is injected via the `SignalDb` interface so unit tests run
 * without a database. `supabaseSignalDb()` builds the real adapter from
 * env (service-role key); it throws AI_DB_UNAVAILABLE when the env is
 * missing. Server-side only — never import from client components.
 */
import { createClient } from '@supabase/supabase-js';

import { AIAgentError } from './types';

/** v1 signal types. */
export const SIGNAL_NEW_POST = 'new_post';
export const SIGNAL_MEMBER_JOINED = 'member_joined';
export const SIGNAL_POINTS_MILESTONE = 'points_milestone';

/**
 * Dedup window: a repeated `dedup_key` inside this window is skipped
 * ({ deduped: true }). Older than the window, the row is re-armed as a
 * fresh signal.
 */
export const SIGNAL_DEDUP_WINDOW_MS = 24 * 60 * 60 * 1000;

/** One row of `ai_signals` (migration 20261015000003_ai_signals.sql). */
export interface AISignalRecord {
    id: string;
    type: string;
    clubId: string;
    payload: Record<string, unknown>;
    dedupKey: string;
    processedAt: string | null;
    createdAt: string;
}

export interface NewAISignalRow {
    type: string;
    clubId: string;
    payload: Record<string, unknown>;
    dedupKey: string;
}

/** Partial update for `updateSignal`. */
export interface AISignalPatch {
    payload?: Record<string, unknown>;
    processedAt?: string | null;
    createdAt?: string;
}

/** Minimal storage surface the signal layer needs. */
export interface SignalDb {
    findByDedupKey(dedupKey: string): Promise<AISignalRecord | null>;
    insertSignal(row: NewAISignalRow): Promise<AISignalRecord>;
    updateSignal(id: string, patch: AISignalPatch): Promise<void>;
    getSignalById(id: string): Promise<AISignalRecord | null>;
}

export interface SignalDeps {
    db: SignalDb;
    now?: () => Date;
}

export interface EmitInput {
    type: string;
    clubId: string;
    payload?: Record<string, unknown>;
    /** Caller-composed dedup identity, e.g. `new_post:<postId>`. */
    dedupKey: string;
}

export interface EmitResult {
    /** True when an identical signal was already emitted inside the dedup window. */
    deduped: boolean;
    signal: AISignalRecord;
}

function isUniqueViolation(err: unknown): boolean {
    return (
        typeof err === 'object' &&
        err !== null &&
        (err as { code?: unknown }).code === '23505'
    );
}

/**
 * Persist a signal, deduplicated by `dedupKey` inside a 24h window.
 *
 * - Same key, row younger than 24h -> { deduped: true }, no new row.
 * - Same key, row 24h or older -> the row is re-armed (payload refreshed,
 *   created_at reset, processed_at cleared) and returned as a fresh signal.
 * - Insert race (two emitters, same key) -> the loser returns { deduped: true }
 *   instead of throwing.
 */
export async function emitSignal(input: EmitInput, deps: SignalDeps): Promise<EmitResult> {
    const { db } = deps;
    const now = deps.now ?? (() => new Date());
    const payload = input.payload ?? {};

    const existing = await db.findByDedupKey(input.dedupKey);
    if (existing) {
        const ageMs = now().getTime() - new Date(existing.createdAt).getTime();
        if (ageMs < SIGNAL_DEDUP_WINDOW_MS) {
            return { deduped: true, signal: existing };
        }
        await db.updateSignal(existing.id, {
            payload,
            processedAt: null,
            createdAt: now().toISOString(),
        });
        const rearmed = await db.getSignalById(existing.id);
        // getSignalById right after update cannot miss, but stay total.
        return { deduped: false, signal: rearmed ?? existing };
    }

    try {
        const signal = await db.insertSignal({
            type: input.type,
            clubId: input.clubId,
            payload,
            dedupKey: input.dedupKey,
        });
        return { deduped: false, signal };
    } catch (err) {
        if (isUniqueViolation(err)) {
            // A concurrent emitter won the race: treat as a duplicate.
            const winner = await db.findByDedupKey(input.dedupKey);
            if (winner) return { deduped: true, signal: winner };
        }
        throw err;
    }
}

/** Load one signal by id (worker route). */
export async function getSignalById(id: string, deps: SignalDeps): Promise<AISignalRecord | null> {
    return deps.db.getSignalById(id);
}

/** Mark a signal processed so the worker never picks it up twice. */
export async function markSignalProcessed(id: string, deps: SignalDeps): Promise<void> {
    const now = deps.now ?? (() => new Date());
    await deps.db.updateSignal(id, { processedAt: now().toISOString() });
}

// ---------------------------------------------------------------------------
// Signal routing (v1)
// ---------------------------------------------------------------------------

/**
 * One routing entry: which staff agent owns the signal type, which
 * registered action it proposes, and how the action inputs are composed
 * from the signal row.
 *
 * v1 composes inputs deterministically (no LLM call per event — cost
 * discipline per ADR-001 §3). The composed draft flows through the full
 * governance pipeline (verifyAndExecute): at proactivity L1 it is stored
 * as a DRAFT for the AI Inbox, never executed. `new_post` and
 * `member_joined` use agent-composed inputs instead (see
 * lib/ai/agents/community-manager.ts) — this table covers the rest.
 */
export interface SignalRoute {
    agentId: string;
    action: string;
    composeInputs: (signal: AISignalRecord) => Record<string, unknown>;
}

/** Recipient for member-facing draft actions, read from the signal payload. */
function recipientOf(signal: AISignalRecord): string | undefined {
    const p = signal.payload;
    for (const key of ['userId', 'authorId', 'recipientId']) {
        const v = p[key];
        if (typeof v === 'string' && v.length > 0) return v;
    }
    return undefined;
}

/**
 * Signal type -> staff agent + action. v1 keeps `points_milestone` on this
 * deterministic path (no LLM call per event — cost discipline per
 * ADR-001 §3). `new_post` and `member_joined` are agent-composed instead:
 * the worker routes them to `draftSignalResponse` / `draftOnboarding` in
 * lib/ai/agents/community-manager.ts, which use invokeAgent to draft the
 * text and then the same verifyAndExecute governance pipeline.
 */
export const SIGNAL_ROUTING: Record<string, SignalRoute> = {
    [SIGNAL_POINTS_MILESTONE]: {
        agentId: 'community-manager',
        action: 'send_message',
        composeInputs: (signal) => ({
            recipientId: recipientOf(signal),
            channel: 'dm',
            body:
                `Draft: you just crossed ${String(signal.payload.threshold ?? '?')} points ` +
                'in this club — nice work, keep it up! Edit me before sending.',
        }),
    },
};

// ---------------------------------------------------------------------------
// Supabase adapter (service-role)
// ---------------------------------------------------------------------------

/**
 * Real SignalDb backed by Supabase (service-role). Throws AI_DB_UNAVAILABLE
 * when SUPABASE env vars are missing.
 */
export function supabaseSignalDb(): SignalDb {
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
        async findByDedupKey(dedupKey: string): Promise<AISignalRecord | null> {
            const { data, error } = await supabase
                .from('ai_signals')
                .select('*')
                .eq('dedup_key', dedupKey)
                .maybeSingle();
            if (error) throw unavailable('read ai_signals', error.message);
            return data ? fromDbRow(data) : null;
        },
        async insertSignal(row: NewAISignalRow): Promise<AISignalRecord> {
            const { data, error } = await supabase
                .from('ai_signals')
                .insert(toDbRow(row))
                .select()
                .single();
            if (error) {
                // Preserve the Postgres unique-violation code for dedup races.
                const err = unavailable('insert ai_signals', error.message) as AIAgentError & {
                    code: string;
                };
                if (error.code === '23505') (err as { code?: string }).code = '23505';
                throw err;
            }
            return fromDbRow(data);
        },
        async updateSignal(id: string, patch: AISignalPatch): Promise<void> {
            const { error } = await supabase.from('ai_signals').update(toDbRow(patch)).eq('id', id);
            if (error) throw unavailable('update ai_signals', error.message);
        },
        async getSignalById(id: string): Promise<AISignalRecord | null> {
            const { data, error } = await supabase
                .from('ai_signals')
                .select('*')
                .eq('id', id)
                .maybeSingle();
            if (error) throw unavailable('read ai_signals', error.message);
            return data ? fromDbRow(data) : null;
        },
    };
}

type DbRow = Record<string, unknown>;

function toDbRow(row: Partial<NewAISignalRow> & Partial<AISignalPatch>): DbRow {
    const out: DbRow = {};
    if (row.type !== undefined) out.type = row.type;
    if (row.clubId !== undefined) out.club_id = row.clubId;
    if (row.payload !== undefined) out.payload = row.payload;
    if (row.dedupKey !== undefined) out.dedup_key = row.dedupKey;
    if (row.processedAt !== undefined) out.processed_at = row.processedAt;
    if (row.createdAt !== undefined) out.created_at = row.createdAt;
    return out;
}

function fromDbRow(data: DbRow): AISignalRecord {
    return {
        id: data.id as string,
        type: data.type as string,
        clubId: data.club_id as string,
        payload: (data.payload as Record<string, unknown>) ?? {},
        dedupKey: data.dedup_key as string,
        processedAt: (data.processed_at as string | null) ?? null,
        createdAt: data.created_at as string,
    };
}
