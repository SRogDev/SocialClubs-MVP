/**
 * AI transparency + audit reads (master plan Phases 73-76).
 *
 * Identity transparency: every piece of AI-generated content carries
 * machine-readable metadata (`ai_generated: true`, agent, action,
 * timestamp) via `markAsAIGenerated`, and a human-readable disclosure
 * label (Spanish-first, English on request) via `getAILabel`.
 *
 * Audit: `ai_actions` is the append-only governance audit trail (ADR-002
 * §5, migration `20261015000002_ai_governance.sql`) — who (agent), what
 * (action + inputs), policy/review/execution results, idempotency key,
 * timestamps. The verification pipeline (`lib/ai/verify.ts`) owns WRITES;
 * this module only READS (sanitized) for the transparency API. Inputs are
 * PII-sanitized on the way out (defense in depth — the log must never
 * carry raw emails, phones, or names to a reader).
 *
 * Privacy model (non-negotiable):
 * - Audit rows are ALWAYS scoped to one club (`club_id` on every row).
 * - RLS on `ai_actions` is service-role only. `listAiActions` does NOT
 *   authorize the caller: the caller MUST enforce club roles first
 *   (e.g. `requireClubRole(requesterId, clubId, ['owner', 'admin'])` for
 *   the audit read API).
 *
 * Storage is injected via the `AuditDb` interface (same pattern as
 * `MemoryDb` in memory.ts) so unit tests run without a database.
 * `supabaseAuditDb()` builds the real adapter from env (service-role key).
 * Server-side only — never import from client components.
 */
import { createClient } from '@supabase/supabase-js';

import { sanitizePII } from './memory';
import { AIAgentError } from './types';

/** Human-readable disclosure for AI-generated content (Spanish-first). */
export const AI_DISCLOSURE_ES =
    'Este contenido fue generado o asistido por la IA del club';

/** Human-readable disclosure for AI-generated content (English). */
export const AI_DISCLOSURE_EN =
    "This content was generated or assisted by the club's AI";

/** Machine-readable metadata attached to AI-generated content. */
export interface AiContentMetadata {
    ai_generated: true;
    agent_id: string;
    action_id: string;
    timestamp: string;
}

/** Content wrapped with its AI-generation metadata. */
export interface MarkedContent {
    content: string;
    aiMetadata: AiContentMetadata;
}

export interface MarkAsAIGeneratedOptions {
    agentId: string;
    actionId: string;
    now?: () => Date;
}

/**
 * Attach AI-generation metadata to a piece of content (post, message,
 * notification body). The content text is returned unchanged; the metadata
 * travels alongside it (e.g. in `notifications.metadata.ai_generated`).
 */
export function markAsAIGenerated(
    content: string,
    opts: MarkAsAIGeneratedOptions,
): MarkedContent {
    if (!opts.agentId?.trim() || !opts.actionId?.trim()) {
        throw new AIAgentError(
            'AI_DB_UNAVAILABLE',
            'markAsAIGenerated requires non-empty agentId and actionId.',
        );
    }
    const now = opts.now ? opts.now() : new Date();
    return {
        content,
        aiMetadata: {
            ai_generated: true,
            agent_id: opts.agentId,
            action_id: opts.actionId,
            timestamp: now.toISOString(),
        },
    };
}

/**
 * The human-readable disclosure label for a given AI action.
 * Spanish by default; English on request. Per-action specialization is a
 * future extension — unknown actions get the generic disclosure, never an
 * error, so labeling can never silently disappear.
 */
export function getAILabel(actionId: string, locale: 'es' | 'en' = 'es'): string {
    void actionId; // reserved: per-action labels specialize here in a later phase
    return locale === 'en' ? AI_DISCLOSURE_EN : AI_DISCLOSURE_ES;
}

// ---------------------------------------------------------------------------
// ai_actions audit reads
// ---------------------------------------------------------------------------

/**
 * One row of `ai_actions` (migration `20261015000002_ai_governance.sql`,
 * written by the verification pipeline in `lib/ai/verify.ts`).
 */
export interface AiAction {
    id: string;
    club_id: string;
    agent_id: string;
    action: string;
    inputs: Record<string, unknown>;
    idempotency_key: string;
    status: string;
    policy_result: Record<string, unknown> | null;
    review_result: Record<string, unknown> | null;
    execution_result: Record<string, unknown> | null;
    created_at: string;
}

/** Minimal storage surface the audit read layer needs. */
export interface AuditDb {
    listActions(clubId: string, limit?: number): Promise<AiAction[]>;
}

export interface AuditDeps {
    db: AuditDb;
}

/**
 * Real AuditDb backed by Supabase (service-role). Throws AI_DB_UNAVAILABLE
 * when SUPABASE env vars are missing.
 */
export function supabaseAuditDb(): AuditDb {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !serviceKey) {
        throw new AIAgentError(
            'AI_DB_UNAVAILABLE',
            'Supabase env (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY) is not configured.',
        );
    }
    const supabase = createClient(url, serviceKey);

    return {
        async listActions(clubId: string, limit = 100): Promise<AiAction[]> {
            const { data, error } = await supabase
                .from('ai_actions')
                .select('*')
                .eq('club_id', clubId)
                .order('created_at', { ascending: false })
                .limit(limit);
            if (error) {
                throw new AIAgentError(
                    'AI_DB_UNAVAILABLE',
                    `Failed to read ai_actions: ${error.message}`,
                );
            }
            return ((data as AiAction[]) ?? []).map((row) => ({
                ...row,
                inputs: sanitizeRecord(row.inputs ?? {}),
            }));
        },
    };
}

function resolveDeps(deps?: AuditDeps): AuditDeps {
    return deps ?? { db: supabaseAuditDb() };
}

/**
 * Sanitize a free-form JSON record for the audit trail: serialize, redact
 * emails/phones, parse back. Falls back to `{}` when the value does not
 * survive a JSON round-trip (defense in depth — the log must never break a
 * caller, and must never carry PII).
 */
function sanitizeRecord(value: Record<string, unknown>): Record<string, unknown> {
    try {
        const parsed: unknown = JSON.parse(sanitizePII(JSON.stringify(value)));
        return typeof parsed === 'object' && parsed !== null
            ? (parsed as Record<string, unknown>)
            : {};
    } catch {
        return {};
    }
}

/**
 * The audit log for one club, newest first, with PII-sanitized inputs.
 * Read-only: rows are written by the verification pipeline
 * (`lib/ai/verify.ts`), never by this module.
 *
 * AUTHORIZATION: this function does NOT authorize the caller. The caller
 * MUST enforce club roles first
 * (e.g. `requireClubRole(requesterId, clubId, ['owner', 'admin'])`).
 */
export async function listAiActions(
    clubId: string,
    deps?: AuditDeps,
    limit = 100,
): Promise<AiAction[]> {
    if (!clubId?.trim()) {
        throw new AIAgentError('AI_DB_UNAVAILABLE', 'listAiActions requires a non-empty clubId.');
    }
    const { db } = resolveDeps(deps);
    const rows = await db.listActions(clubId, limit);
    return rows.map((row) => ({
        ...row,
        inputs: sanitizeRecord(row.inputs ?? {}),
    }));
}
