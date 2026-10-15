/**
 * AI memory + correction feedback loops (master plan Phases 63-66).
 *
 * The AI staff learns from corrections: when a creator rejects a draft with
 * feedback (or approves one with praise), `recordFeedback` logs the feedback
 * to `ai_feedback` and distills it into a club-scoped, agent-scoped memory
 * row in `ai_memory`. Agents load their memories into the prompt context
 * ("memory" section) via `getAgentMemories`, so a correction today prevents
 * the same mistake tomorrow.
 *
 * Privacy model (non-negotiable):
 * - Memories are ALWAYS scoped to one club AND one agent (`club_id` +
 *   `agent_id` on every row) and are never shared or joined across clubs.
 *   There is no cross-club profiling.
 * - Never store raw user PII in memories: `sanitizePII` redacts emails and
 *   phone numbers before anything is persisted. Store preferences/patterns,
 *   not names/emails.
 * - RLS on `ai_memory` / `ai_feedback` is service-role only. These
 *   functions do NOT authorize the caller: the caller MUST enforce club
 *   roles first (e.g. `requireClubRole(requesterId, clubId,
 *   ['owner', 'admin'])`). This is documented on each entry point.
 *
 * Storage is injected via the `MemoryDb` interface (same pattern as
 * `SignalDb` in relationship.ts) so unit tests run without a database.
 * `supabaseMemoryDb()` builds the real adapter from env (service-role key).
 * Server-side only — never import from client components.
 */
import { createClient } from '@supabase/supabase-js';

import { AIAgentError } from './types';

/** Memory sources. The column stays TEXT so future phases can extend it. */
export const MEMORY_SOURCES = ['correction', 'learned', 'config'] as const;
export type MemorySource = (typeof MEMORY_SOURCES)[number];

/** Feedback types: correction -> memory, praise -> learned memory, flag -> log only. */
export const FEEDBACK_TYPES = ['correction', 'praise', 'flag'] as const;
export type FeedbackType = (typeof FEEDBACK_TYPES)[number];

/** One row of `ai_memory`. */
export interface AiMemory {
    id: string;
    club_id: string;
    agent_id: string;
    key: string;
    value: Record<string, unknown>;
    source: MemorySource;
    created_at: string;
    updated_at: string;
}

export interface NewAiMemory {
    club_id: string;
    agent_id: string;
    key: string;
    value: Record<string, unknown>;
    source?: MemorySource;
}

/** One row of `ai_feedback`. */
export interface AiFeedback {
    id: string;
    /** The reviewed `ai_actions` row (nullable in code; FK-enforced in SQL). */
    action_id: string | null;
    feedback_type: FeedbackType;
    content: string;
    created_by: string;
    created_at: string;
}

export interface NewAiFeedback {
    action_id?: string | null;
    feedback_type: FeedbackType;
    content: string;
    created_by: string;
}

/** Minimal storage surface the memory layer needs. */
export interface MemoryDb {
    upsertMemory(row: NewAiMemory): Promise<AiMemory>;
    getMemory(clubId: string, agentId: string, key: string): Promise<AiMemory | null>;
    listMemories(clubId: string, agentId: string): Promise<AiMemory[]>;
    /** Scoped delete: only deletes the row when it belongs to clubId. */
    deleteMemory(id: string, clubId: string): Promise<boolean>;
    insertFeedback(row: NewAiFeedback): Promise<AiFeedback>;
}

export interface MemoryDeps {
    db: MemoryDb;
    now?: () => Date;
}

/**
 * Real MemoryDb backed by Supabase (service-role). Throws AI_DB_UNAVAILABLE
 * when SUPABASE env vars are missing.
 */
export function supabaseMemoryDb(): MemoryDb {
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
        async upsertMemory(row: NewAiMemory): Promise<AiMemory> {
            const { data, error } = await supabase
                .from('ai_memory')
                .upsert(
                    {
                        club_id: row.club_id,
                        agent_id: row.agent_id,
                        key: row.key,
                        value: row.value,
                        source: row.source ?? 'learned',
                        updated_at: new Date().toISOString(),
                    },
                    { onConflict: 'club_id,agent_id,key' },
                )
                .select()
                .single();
            if (error) {
                throw new AIAgentError(
                    'AI_DB_UNAVAILABLE',
                    `Failed to upsert ai_memory row: ${error.message}`,
                );
            }
            return data as AiMemory;
        },
        async getMemory(
            clubId: string,
            agentId: string,
            key: string,
        ): Promise<AiMemory | null> {
            const { data, error } = await supabase
                .from('ai_memory')
                .select('*')
                .eq('club_id', clubId)
                .eq('agent_id', agentId)
                .eq('key', key)
                .maybeSingle();
            if (error) {
                throw new AIAgentError(
                    'AI_DB_UNAVAILABLE',
                    `Failed to read ai_memory: ${error.message}`,
                );
            }
            return (data as AiMemory | null) ?? null;
        },
        async listMemories(clubId: string, agentId: string): Promise<AiMemory[]> {
            const { data, error } = await supabase
                .from('ai_memory')
                .select('*')
                .eq('club_id', clubId)
                .eq('agent_id', agentId)
                .order('updated_at', { ascending: false });
            if (error) {
                throw new AIAgentError(
                    'AI_DB_UNAVAILABLE',
                    `Failed to list ai_memory: ${error.message}`,
                );
            }
            return (data as AiMemory[]) ?? [];
        },
        async deleteMemory(id: string, clubId: string): Promise<boolean> {
            const { data, error } = await supabase
                .from('ai_memory')
                .delete()
                .eq('id', id)
                .eq('club_id', clubId)
                .select('id');
            if (error) {
                throw new AIAgentError(
                    'AI_DB_UNAVAILABLE',
                    `Failed to delete ai_memory row: ${error.message}`,
                );
            }
            return (data?.length ?? 0) > 0;
        },
        async insertFeedback(row: NewAiFeedback): Promise<AiFeedback> {
            const { data, error } = await supabase
                .from('ai_feedback')
                .insert({
                    action_id: row.action_id ?? null,
                    feedback_type: row.feedback_type,
                    content: row.content,
                    created_by: row.created_by,
                })
                .select()
                .single();
            if (error) {
                throw new AIAgentError(
                    'AI_DB_UNAVAILABLE',
                    `Failed to insert ai_feedback row: ${error.message}`,
                );
            }
            return data as AiFeedback;
        },
    };
}

function resolveDeps(deps?: MemoryDeps): MemoryDeps {
    return deps ?? { db: supabaseMemoryDb() };
}

function requireNonEmpty(name: string, value: string): void {
    if (!value?.trim()) {
        throw new AIAgentError(
            'AI_DB_UNAVAILABLE',
            `remember requires a non-empty ${name}.`,
        );
    }
}

/**
 * Redact PII from free-form text before it is persisted as a memory.
 * Replaces emails and phone numbers with placeholders. Memories store
 * preferences/patterns — never names, emails, or phone numbers.
 */
export function sanitizePII(text: string): string {
    return text
        .replace(
            /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g,
            '[redacted-email]',
        )
        .replace(/\+?\d[\d\s().-]{7,}\d/g, '[redacted-phone]')
        .trim();
}

/**
 * Upsert one memory row (club + agent + key). Memories converge: a repeated
 * key replaces the value instead of piling up.
 *
 * AUTHORIZATION: this function does NOT check that the caller may write to
 * the club. The caller MUST enforce club roles first
 * (e.g. `requireClubRole(requesterId, clubId, ['owner', 'admin'])`).
 */
export async function remember(
    clubId: string,
    agentId: string,
    key: string,
    value: Record<string, unknown>,
    source: MemorySource,
    deps?: MemoryDeps,
): Promise<AiMemory> {
    requireNonEmpty('clubId', clubId);
    requireNonEmpty('agentId', agentId);
    requireNonEmpty('key', key);
    if (!(MEMORY_SOURCES as readonly string[]).includes(source)) {
        throw new AIAgentError(
            'AI_DB_UNAVAILABLE',
            `Unknown memory source: ${source}.`,
        );
    }
    const { db } = resolveDeps(deps);
    return db.upsertMemory({ club_id: clubId, agent_id: agentId, key, value, source });
}

/**
 * Get one memory by club/agent/key. Returns null when none exists.
 * Same authorization caveat as `remember`.
 */
export async function recall(
    clubId: string,
    agentId: string,
    key: string,
    deps?: MemoryDeps,
): Promise<AiMemory | null> {
    requireNonEmpty('clubId', clubId);
    requireNonEmpty('agentId', agentId);
    requireNonEmpty('key', key);
    const { db } = resolveDeps(deps);
    return db.getMemory(clubId, agentId, key);
}

/**
 * All memories for a club/agent pair, newest first — the input for the
 * agent's prompt "memory" section. Same authorization caveat as `remember`.
 */
export async function getAgentMemories(
    clubId: string,
    agentId: string,
    deps?: MemoryDeps,
): Promise<AiMemory[]> {
    requireNonEmpty('clubId', clubId);
    requireNonEmpty('agentId', agentId);
    const { db } = resolveDeps(deps);
    return db.listMemories(clubId, agentId);
}

/**
 * Remove one memory by id (creator curation). The delete is scoped to
 * `clubId`: it only succeeds when the memory belongs to that club. Returns
 * true when a row was deleted. The caller must enforce club roles
 * (e.g. `requireClubRole(requesterId, clubId, ['owner', 'admin'])`) before
 * calling.
 */
export async function deleteMemory(
    id: string,
    clubId: string,
    deps?: MemoryDeps,
): Promise<boolean> {
    if (!id?.trim()) {
        throw new AIAgentError('AI_DB_UNAVAILABLE', 'deleteMemory requires a non-empty id.');
    }
    requireNonEmpty('clubId', clubId);
    const { db } = resolveDeps(deps);
    return db.deleteMemory(id, clubId);
}

/**
 * Compact, prompt-safe rendering of an agent's memories for the "memory"
 * section of its prompt. Never invents data: with no memories it says so
 * explicitly.
 */
export function summarizeMemoriesForPrompt(memories: AiMemory[]): string {
    if (memories.length === 0) {
        return 'No learned memories for this club yet. Work from the request as stated.';
    }
    const lines = memories.map((m) => {
        const pref =
            typeof m.value['preference'] === 'string' && m.value['preference'].length > 0
                ? (m.value['preference'] as string)
                : JSON.stringify(m.value);
        return `- [${m.source}] ${m.key}: ${pref}`;
    });
    return (
        'Learned memories for this club (from past creator feedback — follow these):\n' +
        lines.join('\n')
    );
}

// ---------------------------------------------------------------------------
// Correction -> memory extraction (deterministic heuristic, zero LLM cost)
// ---------------------------------------------------------------------------

/** A memory distilled from one piece of feedback. */
export interface ExtractedMemory {
    key: string;
    value: Record<string, unknown>;
    source: MemorySource;
}

/** Preference categories the heuristic can detect -> memory key fragment. */
/** Preference categories the heuristic can detect -> memory key fragment.
 *  Concrete nouns are checked before generic adjectives so that e.g.
 *  "short titles" classifies as `title`, not `length`. */
const PREFERENCE_CATEGORIES: ReadonlyArray<readonly [string, RegExp]> = [
    ['title', /\btitles?\b/i],
    ['emoji', /\bemojis?\b/i],
    ['timing', /\b(timing|schedules?|when to|time of day|frequency)\b/i],
    ['topic', /\b(topics?|subject|theme|about)\b/i],
    ['language', /\b(language|spanish|english|espa[ñn]ol|ingl[ée]s)\b/i],
    ['cta', /\b(cta|call to action|rsvp|register|sign ?ups?)\b/i],
    ['length', /\b(length|long|short|word counts?|words?|brevity|concise|verbose)\b/i],
    ['tone', /\b(tone|formal|casual|playful|serious|friendly|warm|corporate)\b/i],
];

function detectCategory(text: string): string {
    for (const [name, re] of PREFERENCE_CATEGORIES) {
        if (re.test(text)) return name;
    }
    return 'general';
}

/** Clause cleanup: drop trailing punctuation, cap length. */
function cleanClause(clause: string): string {
    return clause.replace(/[.!?,;:]+$/, '').trim().slice(0, 200);
}

const PREFER_PATTERNS: RegExp[] = [
    /\bprefer(?:s)?\s+(?:that\s+)?(.{4,200})/i,
    /\b(?:like|love)\s+(?:it\s+)?when\s+(.{4,200})/i,
    /\bkeep\s+(?:it|them|the)\s+(.{4,200})/i,
];

const AVOID_PATTERNS: RegExp[] = [
    /\b(?:don't|do not|doesn't|does not|never|avoid|no more|stop)\s+(.{4,200})/i,
    /\btoo\s+(long|short|formal|casual|salesy|many|much|frequent|repetitive)\b/i,
];

function firstMatch(text: string, patterns: RegExp[]): string | null {
    for (const re of patterns) {
        const m = re.exec(text);
        if (m?.[1]) {
            const clause = cleanClause(m[1]);
            if (clause.length >= 4) return clause;
        }
    }
    return null;
}

/**
 * Pure, deterministic extraction of a memory from feedback text. No LLM, no
 * DB — unit-testable. Returns null when nothing worth remembering is found.
 *
 * - 'correction' -> key `correction-<category>`, polarity 'prefer'/'avoid'
 *   when a preference clause is detected, 'note' otherwise.
 * - 'praise' -> key `praise-<category>`, polarity 'prefer'.
 * - 'flag' -> null (flags are logged to `ai_feedback` but never remembered).
 */
export function extractMemoryFromFeedback(
    type: FeedbackType,
    content: string,
): ExtractedMemory | null {
    if (type === 'flag') return null;
    const clean = sanitizePII(content).trim();
    if (clean.length === 0) return null;

    const category = detectCategory(clean);
    if (type === 'praise') {
        return {
            key: `praise-${category}`,
            value: { preference: clean, polarity: 'prefer' },
            source: 'learned',
        };
    }

    // type === 'correction'
    const prefer = firstMatch(clean, PREFER_PATTERNS);
    const avoid = prefer ? null : firstMatch(clean, AVOID_PATTERNS);
    const clause = prefer ?? avoid;
    if (clause) {
        // A tiny clause ("long", "formal") carries no context on its own —
        // keep the full sanitized feedback so the memory is actionable.
        const preference = clause.length >= 12 ? clause : clean;
        return {
            key: `correction-${category}`,
            value: { preference, polarity: prefer ? 'prefer' : 'avoid' },
            source: 'correction',
        };
    }
    // Fallback: the correction says something, but no preference clause was
    // detected — remember the sanitized guidance verbatim so the agent does
    // not repeat the mistake.
    return {
        key: `correction-${category}`,
        value: { preference: clean, polarity: 'note' },
        source: 'correction',
    };
}

export interface RecordFeedbackInput {
    /** The reviewed `ai_actions` row id (nullable). */
    actionId?: string | null;
    clubId: string;
    agentId: string;
    type: FeedbackType;
    content: string;
    userId: string;
}

export interface RecordFeedbackResult {
    feedback: AiFeedback;
    /** The memory created from the feedback, or null (flags, empty content). */
    memory: AiMemory | null;
}

/**
 * Log creator feedback and distill it into a memory the agent will not
 * forget:
 * - 'correction' -> `ai_feedback` row + `ai_memory` row (source 'correction').
 *   The memory key is deterministic per preference category, so repeated
 *   corrections converge on one row per category instead of piling up.
 * - 'praise' -> `ai_feedback` row + `ai_memory` row (source 'learned') so
 *   approved styles are reinforced.
 * - 'flag' -> `ai_feedback` row only; flags are reviewed by humans and are
 *   never turned into agent memories automatically.
 *
 * Memory content is PII-scrubbed before persisting.
 *
 * AUTHORIZATION: this function does NOT check that the caller may write to
 * the club. The caller MUST enforce club roles first
 * (e.g. `requireClubRole(requesterId, clubId, ['owner', 'admin'])`).
 */
export async function recordFeedback(
    input: RecordFeedbackInput,
    deps?: MemoryDeps,
): Promise<RecordFeedbackResult> {
    if (!(FEEDBACK_TYPES as readonly string[]).includes(input.type)) {
        throw new AIAgentError(
            'AI_DB_UNAVAILABLE',
            `Unknown feedback type: ${String(input.type)}.`,
        );
    }
    requireNonEmpty('clubId', input.clubId);
    requireNonEmpty('agentId', input.agentId);
    requireNonEmpty('userId', input.userId);

    const { db } = resolveDeps(deps);
    const feedback = await db.insertFeedback({
        action_id: input.actionId ?? null,
        feedback_type: input.type,
        content: input.content ?? '',
        created_by: input.userId,
    });

    const extracted = extractMemoryFromFeedback(input.type, input.content ?? '');
    const memory = extracted
        ? await db.upsertMemory({
              club_id: input.clubId,
              agent_id: input.agentId,
              key: extracted.key,
              value: extracted.value,
              source: extracted.source,
          })
        : null;

    return { feedback, memory };
}

/**
 * Fire-and-forget feedback recording for use inside review actions. NEVER
 * throws — a failed feedback insert must not break the review it annotates.
 * Errors are logged and swallowed.
 */
export async function recordFeedbackSafe(
    input: RecordFeedbackInput,
    deps?: MemoryDeps,
): Promise<void> {
    try {
        await recordFeedback(input, deps);
    } catch (err) {
        console.warn('[memory] feedback recording failed (non-fatal):', err);
    }
}
