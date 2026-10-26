/**
 * Supermemory HTTP transport (Workstream A — club memory infrastructure).
 *
 * Thin, dependency-free client for the documented Supermemory API
 * (https://supermemory.ai/docs/api-reference, verified 2026-10-23):
 *
 * - Ingest:  POST   /v3/documents       { content, containerTags, customId, metadata, taskType }
 * - Search:  POST   /v4/search          { q, containerTags, limit, searchMode, include }
 * - List:    POST   /v3/documents/list  { containerTags, limit }
 * - Delete:  DELETE /v3/documents/bulk  { ids, containerTags }
 * - Auth:    Authorization: Bearer <SUPERMEMORY_API_KEY>
 *
 * A "namespace" (their current term; v3/v4 called it a container tag) scopes
 * every call: one namespace per club (`club_<clubId>`, see knowledge.ts), so
 * cross-club reads are impossible by construction — every request carries
 * exactly one namespace.
 *
 * EXIT PATH (Roger's requirement): the base URL is configurable via
 * SUPERMEMORY_API_URL, so the same code can later point at a self-hosted
 * Supermemory instance (their self-hosted binary exposes the same API) or
 * be replaced behind the KnowledgeProvider interface in knowledge.ts.
 *
 * Server-side only. Never import from client components; the API key must
 * never reach the browser.
 */

/** Raw search result item as returned by POST /v4/search (fields optional — parsed defensively). */
export interface SupermemorySearchResult {
    id?: string;
    documentId?: string;
    customId?: string;
    title?: string;
    content?: string;
    metadata?: Record<string, unknown>;
    score?: number;
    chunks?: Array<{ content: string; score?: number }>;
}

export interface SupermemoryTransport {
    addDocument(input: {
        namespace: string;
        customId: string;
        content: string;
        metadata: Record<string, unknown>;
    }): Promise<{ id: string; status: string }>;
    search(input: {
        namespace: string;
        query: string;
        limit: number;
        searchMode?: 'chunks' | 'hybrid' | 'memories';
    }): Promise<{ results: SupermemorySearchResult[] }>;
    listDocuments(input: {
        namespace: string;
        limit?: number;
    }): Promise<{ documents: Array<{ id: string; customId?: string; metadata?: Record<string, unknown> }> }>;
    deleteDocuments(input: { namespace: string; ids: string[] }): Promise<{ deletedCount: number }>;
}

/** Typed transport failure: HTTP status + endpoint, never a raw fetch error. */
export class SupermemoryError extends Error {
    readonly status: number;
    readonly endpoint: string;

    constructor(status: number, endpoint: string, message: string) {
        super(message);
        this.name = 'SupermemoryError';
        this.status = status;
        this.endpoint = endpoint;
    }
}

export interface SupermemoryTransportOptions {
    apiKey: string;
    /** Defaults to https://api.supermemory.ai — override for self-hosted. */
    baseUrl?: string;
    /** Injectable fetch (tests). Defaults to the global fetch. */
    fetchImpl?: typeof fetch;
}

const DEFAULT_BASE_URL = 'https://api.supermemory.ai';

export function createSupermemoryTransport(
    options: SupermemoryTransportOptions,
): SupermemoryTransport {
    const baseUrl = (options.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, '');
    const doFetch = options.fetchImpl ?? fetch;

    async function call<T>(method: string, path: string, body: unknown): Promise<T> {
        let res: Response;
        try {
            res = await doFetch(`${baseUrl}${path}`, {
                method,
                headers: {
                    Authorization: `Bearer ${options.apiKey}`,
                    'Content-Type': 'application/json',
                },
                body: body === undefined ? undefined : JSON.stringify(body),
            });
        } catch (err) {
            throw new SupermemoryError(
                0,
                path,
                `Supermemory unreachable at ${path}: ${err instanceof Error ? err.message : String(err)}`,
            );
        }
        if (!res.ok) {
            let detail = '';
            try {
                detail = await res.text();
            } catch {
                detail = '';
            }
            throw new SupermemoryError(
                res.status,
                path,
                `Supermemory ${method} ${path} failed with ${res.status}${detail ? `: ${detail.slice(0, 200)}` : ''}`,
            );
        }
        return (await res.json()) as T;
    }

    return {
        async addDocument({ namespace, customId, content, metadata }) {
            // taskType 'superrag': club knowledge is reference material — it
            // must be searchable, NOT turned into extracted "memories" or a
            // profile (cheaper, and the privacy-minimal pipeline).
            const out = await call<{ id: string; status: string }>('POST', '/v3/documents', {
                content,
                containerTags: [namespace],
                customId,
                metadata,
                taskType: 'superrag',
            });
            return { id: out.id, status: out.status };
        },

        async search({ namespace, query, limit, searchMode }) {
            const out = await call<{ results: SupermemorySearchResult[] }>(
                'POST',
                '/v4/search',
                {
                    q: query,
                    containerTags: [namespace],
                    limit,
                    searchMode: searchMode ?? 'chunks',
                    include: { chunks: true, documents: true },
                },
            );
            return { results: out.results ?? [] };
        },

        async listDocuments({ namespace, limit }) {
            const out = await call<{
                memories?: Array<{
                    id: string;
                    customId?: string;
                    metadata?: Record<string, unknown>;
                }>;
            }>('POST', '/v3/documents/list', {
                containerTags: [namespace],
                limit: limit ?? 200,
            });
            return {
                documents: (out.memories ?? []).map((d) => ({
                    id: d.id,
                    customId: d.customId,
                    metadata: d.metadata,
                })),
            };
        },

        async deleteDocuments({ namespace, ids }) {
            if (ids.length === 0) return { deletedCount: 0 };
            const out = await call<{ deletedCount: number }>('DELETE', '/v3/documents/bulk', {
                ids,
                containerTags: [namespace],
            });
            return { deletedCount: out.deletedCount ?? 0 };
        },
    };
}

/**
 * Build the transport from env, or return null when SUPERMEMORY_API_KEY is
 * absent — the graceful-degradation switch for the whole knowledge layer
 * (same pattern as the AIsa client: no key -> deterministic fallback).
 */
export function supermemoryFromEnv(
    fetchImpl?: typeof fetch,
): SupermemoryTransport | null {
    const apiKey = process.env.SUPERMEMORY_API_KEY;
    if (!apiKey?.trim()) return null;
    const baseUrl = process.env.SUPERMEMORY_API_URL?.trim();
    return createSupermemoryTransport({
        apiKey: apiKey.trim(),
        ...(baseUrl ? { baseUrl } : {}),
        ...(fetchImpl ? { fetchImpl } : {}),
    });
}
