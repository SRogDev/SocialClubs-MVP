/**
 * Club knowledge layer (Workstream A — Supermemory memory infrastructure).
 *
 * Roger's decision (2026-10-23): Supermemory becomes the memory
 * infrastructure for SocialClubs clubs, with the exit designed from day 1:
 *
 * - **Supabase is the source of truth.** Every document in Supermemory is
 *   DERIVED from rows SocialClubs owns (club profile, `club_ai_config`
 *   FAQ, knowledge corrections) and can be rebuilt at any time with
 *   `rebuildClubKnowledge`. Supermemory never holds the only copy of
 *   anything.
 * - **One namespace per club**: `club_<clubId>`. Every provider call is
 *   scoped to exactly one namespace, so a club can never read another
 *   club's knowledge (plan Phases 18/44 — authorization-aware retrieval,
 *   no cross-club leakage, enforced by construction, not by prompt).
 * - **Provider interface**: all callers go through `KnowledgeProvider`.
 *   Today: Supermemory (hosted). Tomorrow: the same interface over a
 *   self-hosted Supermemory (SUPERMEMORY_API_URL) or pgvector, without
 *   touching callers.
 * - **Ingestion scope (context minimization, Phases 18/44/72)**: ONLY club
 *   knowledge — FAQ entries, the club profile (name, description, rules),
 *   and knowledge-type creator corrections. Raw member content (posts,
 *   DMs, member PII) is NEVER sent. See docs/MEMORY_INFRASTRUCTURE.md for
 *   the exact inventory (it feeds the privacy policy).
 * - **Graceful degradation**: without SUPERMEMORY_API_KEY the provider
 *   resolves to null; search returns null and callers fall back to the
 *   previous behavior (FAQ context from Supabase), sync/rebuild no-op.
 *
 * Server-side only (node:crypto + service-role reads).
 */
import { createHash } from 'node:crypto';

import { createClient } from '@supabase/supabase-js';

import { sanitizePII } from './memory';
import {
    supermemoryFromEnv,
    type SupermemoryTransport,
} from './supermemory-client';
import { AIAgentError } from './types';

// ---------------------------------------------------------------------------
// Document model
// ---------------------------------------------------------------------------

export const KNOWLEDGE_KINDS = ['faq', 'club_profile', 'correction'] as const;
export type KnowledgeKind = (typeof KNOWLEDGE_KINDS)[number];

/** One derived knowledge document. `id` is stable across rebuilds. */
export interface KnowledgeDoc {
    id: string;
    clubId: string;
    kind: KnowledgeKind;
    title: string;
    content: string;
    /** sha256 of content — lets sync/tests detect changes deterministically. */
    hash: string;
}

export interface KnowledgeHit {
    docId: string;
    kind: string;
    content: string;
    score: number;
}

export interface KnowledgeSearchOptions {
    kinds?: KnowledgeKind[];
    limit?: number;
}

/** The swap point for the whole memory backend. */
export interface KnowledgeProvider {
    readonly id: 'supermemory' | 'memory';
    ingest(clubId: string, docs: KnowledgeDoc[]): Promise<void>;
    remove(clubId: string, docIds: string[]): Promise<void>;
    clear(clubId: string): Promise<void>;
    listDocIds(clubId: string): Promise<string[]>;
    search(
        clubId: string,
        query: string,
        opts?: KnowledgeSearchOptions,
    ): Promise<KnowledgeHit[]>;
}

// ---------------------------------------------------------------------------
// Namespace + stable ids
// ---------------------------------------------------------------------------

/** One namespace per club. Sanitized to [a-zA-Z0-9_-] for URL safety. */
export function clubNamespace(clubId: string): string {
    const safe = clubId.replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-+|-+$/g, '');
    return `club_${safe}`;
}

function sha1Hex(input: string): string {
    return createHash('sha1').update(input).digest('hex');
}

function sha256Hex(input: string): string {
    return createHash('sha256').update(input).digest('hex');
}

/**
 * Stable document id for one FAQ entry, derived from the question text.
 * Editing the question creates a new doc (and orphans the old one, which
 * sync then deletes); editing only the answer keeps the id and upserts.
 */
export function faqDocId(question: string): string {
    const normalized = question.trim().toLowerCase().replace(/\s+/g, ' ');
    return `faq-${sha1Hex(normalized).slice(0, 16)}`;
}

export const CLUB_PROFILE_DOC_ID = 'club-profile';

export function correctionDocId(key: string): string {
    return `correction-${key.replace(/[^a-zA-Z0-9_-]+/g, '-').slice(0, 60)}`;
}

// ---------------------------------------------------------------------------
// Source -> documents (pure mapping; this is the ONLY ingestion path)
// ---------------------------------------------------------------------------

export interface ClubKnowledgeSource {
    club: {
        name: string;
        description?: string | null;
        rules?: string | null;
        category?: string | null;
    } | null;
    faq: Array<{ q: string; a: string }>;
    /** Knowledge-type creator corrections (already PII-sanitized at write). */
    corrections: Array<{ key: string; preference: string }>;
}

function makeDoc(
    clubId: string,
    kind: KnowledgeKind,
    id: string,
    title: string,
    content: string,
): KnowledgeDoc {
    return { id, clubId, kind, title, content, hash: sha256Hex(content) };
}

/**
 * Map a club's source-of-truth rows to derived knowledge documents.
 * Deterministic: same source in -> same docs (ids + hashes) out.
 */
export function buildClubKnowledgeDocs(
    clubId: string,
    source: ClubKnowledgeSource,
): KnowledgeDoc[] {
    const docs: KnowledgeDoc[] = [];

    for (const entry of source.faq) {
        const q = entry.q?.trim();
        const a = entry.a?.trim();
        if (!q || !a) continue;
        docs.push(
            makeDoc(
                clubId,
                'faq',
                faqDocId(q),
                q,
                `Pregunta: ${q}\nRespuesta: ${a}`,
            ),
        );
    }

    if (source.club) {
        const lines: string[] = [];
        if (source.club.name?.trim()) lines.push(`Club: ${source.club.name.trim()}`);
        if (source.club.category?.trim())
            lines.push(`Categoría: ${source.club.category.trim()}`);
        if (source.club.description?.trim())
            lines.push(`Descripción: ${source.club.description.trim()}`);
        if (source.club.rules?.trim()) lines.push(`Reglas: ${source.club.rules.trim()}`);
        if (lines.length > 0) {
            docs.push(
                makeDoc(
                    clubId,
                    'club_profile',
                    CLUB_PROFILE_DOC_ID,
                    source.club.name?.trim() || 'Perfil del club',
                    lines.join('\n'),
                ),
            );
        }
    }

    const seenCorrections = new Set<string>();
    for (const correction of source.corrections) {
        const id = correctionDocId(correction.key);
        if (seenCorrections.has(id)) continue;
        seenCorrections.add(id);
        // Corrections were sanitized when recorded (memory.ts); sanitize
        // again defensively — nothing with an email/phone reaches the index.
        const content = sanitizePII(correction.preference ?? '');
        if (!content) continue;
        docs.push(makeDoc(clubId, 'correction', id, correction.key, content));
    }

    return docs;
}

// ---------------------------------------------------------------------------
// Source storage (Supabase = source of truth)
// ---------------------------------------------------------------------------

export interface KnowledgeSourceDb {
    getClubSource(clubId: string): Promise<ClubKnowledgeSource>;
}

/** Real source reader backed by Supabase (service-role). */
export function supabaseKnowledgeSourceDb(): KnowledgeSourceDb {
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
        async getClubSource(clubId: string): Promise<ClubKnowledgeSource> {
            const [clubRes, configRes, memoryRes] = await Promise.all([
                supabase
                    .from('clubs')
                    .select('name, description, rules, category')
                    .eq('id', clubId)
                    .maybeSingle(),
                supabase
                    .from('club_ai_config')
                    .select('policies')
                    .eq('club_id', clubId)
                    .maybeSingle(),
                supabase
                    .from('ai_memory')
                    .select('key, value')
                    .eq('club_id', clubId)
                    .eq('source', 'correction'),
            ]);
            for (const res of [clubRes, configRes, memoryRes]) {
                if (res.error) {
                    throw new AIAgentError(
                        'AI_DB_UNAVAILABLE',
                        `Failed to read club knowledge source: ${res.error.message}`,
                    );
                }
            }

            const policies = (configRes.data?.policies ?? {}) as Record<string, unknown>;
            const rawFaq = Array.isArray(policies.faq) ? policies.faq : [];
            const faq = rawFaq
                .filter(
                    (e): e is { q: string; a: string } =>
                        !!e &&
                        typeof e === 'object' &&
                        typeof (e as { q?: unknown }).q === 'string' &&
                        typeof (e as { a?: unknown }).a === 'string',
                )
                .map((e) => ({ q: e.q, a: e.a }));

            const corrections = (memoryRes.data ?? [])
                .map((row) => {
                    const value = (row.value ?? {}) as Record<string, unknown>;
                    const preference =
                        typeof value['preference'] === 'string'
                            ? (value['preference'] as string)
                            : '';
                    return { key: String(row.key), preference };
                })
                .filter((c) => c.preference.length > 0);

            return {
                club: clubRes.data
                    ? {
                          name: String(clubRes.data.name ?? ''),
                          description: clubRes.data.description ?? null,
                          rules: clubRes.data.rules ?? null,
                          category: clubRes.data.category ?? null,
                      }
                    : null,
                faq,
                corrections,
            };
        },
    };
}

// ---------------------------------------------------------------------------
// Providers
// ---------------------------------------------------------------------------

/** Supermemory-backed provider. One namespace per club on every call. */
export class SupermemoryKnowledgeProvider implements KnowledgeProvider {
    readonly id = 'supermemory' as const;

    constructor(private readonly transport: SupermemoryTransport) {}

    async ingest(clubId: string, docs: KnowledgeDoc[]): Promise<void> {
        const namespace = clubNamespace(clubId);
        for (const doc of docs) {
            await this.transport.addDocument({
                namespace,
                customId: doc.id,
                content: doc.content,
                metadata: { docId: doc.id, kind: doc.kind, clubId: doc.clubId, hash: doc.hash },
            });
        }
    }

    async remove(clubId: string, docIds: string[]): Promise<void> {
        if (docIds.length === 0) return;
        await this.transport.deleteDocuments({ namespace: clubNamespace(clubId), ids: docIds });
    }

    async clear(clubId: string): Promise<void> {
        const ids = await this.listDocIds(clubId);
        await this.remove(clubId, ids);
    }

    async listDocIds(clubId: string): Promise<string[]> {
        const { documents } = await this.transport.listDocuments({
            namespace: clubNamespace(clubId),
        });
        return documents.map(
            (d) =>
                d.customId ??
                (typeof d.metadata?.docId === 'string' ? d.metadata.docId : d.id),
        );
    }

    async search(
        clubId: string,
        query: string,
        opts: KnowledgeSearchOptions = {},
    ): Promise<KnowledgeHit[]> {
        const { results } = await this.transport.search({
            namespace: clubNamespace(clubId),
            query,
            limit: opts.limit ?? 5,
            searchMode: 'chunks',
        });
        const hits: KnowledgeHit[] = [];
        for (const r of results) {
            const docId =
                (typeof r.metadata?.docId === 'string' ? r.metadata.docId : undefined) ??
                r.customId ??
                r.documentId ??
                r.id;
            if (!docId) continue;
            const kind = typeof r.metadata?.kind === 'string' ? r.metadata.kind : 'unknown';
            if (opts.kinds && !(opts.kinds as string[]).includes(kind)) continue;
            const content =
                r.chunks && r.chunks.length > 0
                    ? r.chunks.map((c) => c.content).join('\n')
                    : (r.content ?? '');
            const score = r.score ?? r.chunks?.[0]?.score ?? 0;
            hits.push({ docId, kind, content, score });
        }
        return hits;
    }
}

/**
 * Deterministic in-memory provider: keyword-overlap search, no network.
 * Used by unit tests and AI evals (the "mocked Supermemory client"), and
 * available as a dev double. NOT a production fallback — production
 * degradation is "provider = null" (see resolveKnowledgeProvider).
 */
export class InMemoryKnowledgeProvider implements KnowledgeProvider {
    readonly id = 'memory' as const;
    private readonly namespaces = new Map<string, Map<string, KnowledgeDoc>>();

    private ns(clubId: string): Map<string, KnowledgeDoc> {
        const key = clubNamespace(clubId);
        if (!this.namespaces.has(key)) this.namespaces.set(key, new Map());
        return this.namespaces.get(key)!;
    }

    async ingest(clubId: string, docs: KnowledgeDoc[]): Promise<void> {
        const ns = this.ns(clubId);
        for (const doc of docs) ns.set(doc.id, doc);
    }

    async remove(clubId: string, docIds: string[]): Promise<void> {
        const ns = this.ns(clubId);
        for (const id of docIds) ns.delete(id);
    }

    async clear(clubId: string): Promise<void> {
        this.namespaces.delete(clubNamespace(clubId));
    }

    async listDocIds(clubId: string): Promise<string[]> {
        return [...this.ns(clubId).keys()];
    }

    async search(
        clubId: string,
        query: string,
        opts: KnowledgeSearchOptions = {},
    ): Promise<KnowledgeHit[]> {
        const tokens = tokenize(query);
        if (tokens.length === 0) return [];
        const scored: KnowledgeHit[] = [];
        for (const doc of this.ns(clubId).values()) {
            if (opts.kinds && !opts.kinds.includes(doc.kind)) continue;
            const docTokens = new Set(tokenize(doc.content));
            let matched = 0;
            for (const t of tokens) if (docTokens.has(t)) matched++;
            if (matched === 0) continue;
            scored.push({
                docId: doc.id,
                kind: doc.kind,
                content: doc.content,
                score: matched / tokens.length,
            });
        }
        scored.sort((a, b) => b.score - a.score || a.docId.localeCompare(b.docId));
        return scored.slice(0, opts.limit ?? 5);
    }
}

function tokenize(text: string): string[] {
    return text
        .toLowerCase()
        .split(/[^a-záéíóúñü0-9]+/i)
        .filter((t) => t.length >= 3);
}

// ---------------------------------------------------------------------------
// Orchestration: resolve / sync / rebuild / search
// ---------------------------------------------------------------------------

export interface KnowledgeDeps {
    /** Injected provider (tests/evals). `null` forces the disabled path. */
    provider?: KnowledgeProvider | null;
    /** Injected source reader (tests). Defaults to the Supabase adapter. */
    source?: KnowledgeSourceDb;
}

/**
 * Resolve the active provider: injected dep wins; otherwise Supermemory
 * when SUPERMEMORY_API_KEY is configured; otherwise null (disabled —
 * callers degrade to Supabase-only behavior).
 */
export function resolveKnowledgeProvider(deps?: KnowledgeDeps): KnowledgeProvider | null {
    if (deps && 'provider' in deps) return deps.provider ?? null;
    const transport = supermemoryFromEnv();
    return transport ? new SupermemoryKnowledgeProvider(transport) : null;
}

function resolveSource(deps?: KnowledgeDeps): KnowledgeSourceDb {
    return deps?.source ?? supabaseKnowledgeSourceDb();
}

export interface SyncResult {
    skipped: boolean;
    ingested: number;
    removed: number;
}

/**
 * Bring the club's derived index in line with the Supabase source of
 * truth: upsert every source document (stable ids — unchanged content is
 * deduplicated provider-side) and delete documents whose source rows are
 * gone (FAQ question edited/removed, correction deleted). No-op when the
 * provider is disabled.
 */
export async function syncClubKnowledge(
    clubId: string,
    deps?: KnowledgeDeps,
): Promise<SyncResult> {
    const provider = resolveKnowledgeProvider(deps);
    if (!provider) return { skipped: true, ingested: 0, removed: 0 };

    const source = await resolveSource(deps).getClubSource(clubId);
    const docs = buildClubKnowledgeDocs(clubId, source);
    const sourceIds = new Set(docs.map((d) => d.id));
    const remoteIds = await provider.listDocIds(clubId);
    const orphans = remoteIds.filter((id) => !sourceIds.has(id));

    await provider.ingest(clubId, docs);
    if (orphans.length > 0) await provider.remove(clubId, orphans);
    return { skipped: false, ingested: docs.length, removed: orphans.length };
}

/**
 * Full rebuild: wipe the club's namespace and re-ingest everything from
 * the Supabase source. This is the migration/exit primitive — moving to
 * self-hosted Supermemory or pgvector means: point the provider at the
 * new backend and rebuild every club from source.
 */
export async function rebuildClubKnowledge(
    clubId: string,
    deps?: KnowledgeDeps,
): Promise<{ skipped: boolean; ingested: number }> {
    const provider = resolveKnowledgeProvider(deps);
    if (!provider) return { skipped: true, ingested: 0 };

    const source = await resolveSource(deps).getClubSource(clubId);
    const docs = buildClubKnowledgeDocs(clubId, source);
    await provider.clear(clubId);
    await provider.ingest(clubId, docs);
    return { skipped: false, ingested: docs.length };
}

/**
 * Search one club's knowledge. Returns null when the provider is disabled
 * (callers then use their Supabase-only fallback). Provider failures
 * propagate as typed AIAgentError so callers can log + degrade explicitly.
 */
export async function searchClubKnowledge(
    clubId: string,
    query: string,
    opts: KnowledgeSearchOptions = {},
    deps?: KnowledgeDeps,
): Promise<KnowledgeHit[] | null> {
    const provider = resolveKnowledgeProvider(deps);
    if (!provider) return null;
    try {
        return await provider.search(clubId, query, opts);
    } catch (err) {
        throw new AIAgentError(
            'AI_KNOWLEDGE_UNAVAILABLE',
            `Club knowledge search failed for club ${clubId}: ${err instanceof Error ? err.message : String(err)}`,
            { cause: err },
        );
    }
}

/**
 * Fire-and-forget sync for write paths (config saves, correction
 * recording). NEVER throws — a failed index sync must not break the
 * creator's save; the next sync or a manual rebuild converges the index.
 */
export async function syncClubKnowledgeSafe(
    clubId: string,
    deps?: KnowledgeDeps,
): Promise<void> {
    try {
        await syncClubKnowledge(clubId, deps);
    } catch (err) {
        console.warn('[knowledge] club knowledge sync failed (non-fatal):', err);
    }
}
