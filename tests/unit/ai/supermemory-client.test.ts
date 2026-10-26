/**
 * Supermemory HTTP transport tests (Workstream A).
 *
 * The transport is exercised against a fake fetch: no network, no key.
 * These tests pin the documented contract (docs: api.supermemory.ai):
 * - ingest:  POST /v3/documents { content, containerTags: [ns], customId, metadata, taskType: 'superrag' }
 * - search:  POST /v4/search    { q, containerTags: [ns], limit, searchMode }
 * - list:    POST /v3/documents/list { containerTags: [ns] }
 * - delete:  DELETE /v3/documents/bulk { ids, containerTags: [ns] }
 * - auth:    Authorization: Bearer <key>
 */
import {
    createSupermemoryTransport,
    SupermemoryError,
    supermemoryFromEnv,
} from '@/lib/ai/supermemory-client';

interface RecordedCall {
    url: string;
    method: string;
    headers: Record<string, string>;
    body: unknown;
}

function fakeFetch(responseBody: unknown, status = 200) {
    const calls: RecordedCall[] = [];
    const impl = (async (url: string, init?: RequestInit) => {
        calls.push({
            url,
            method: init?.method ?? 'GET',
            headers: (init?.headers ?? {}) as Record<string, string>,
            body: init?.body ? JSON.parse(String(init.body)) : undefined,
        });
        return {
            ok: status >= 200 && status < 300,
            status,
            json: async () => responseBody,
            text: async () => JSON.stringify(responseBody),
        } as Response;
    }) as unknown as typeof fetch;
    return { impl, calls };
}

describe('createSupermemoryTransport', () => {
    it('ingests a document into the namespace with the stable customId and superrag task type', async () => {
        const { impl, calls } = fakeFetch({ id: 'sm-1', status: 'queued' });
        const transport = createSupermemoryTransport({
            apiKey: 'key-123',
            baseUrl: 'https://api.supermemory.ai',
            fetchImpl: impl,
        });

        const out = await transport.addDocument({
            namespace: 'club_abc',
            customId: 'faq-0123',
            content: 'P: ¿Horario?\nR: 9 a 18h',
            metadata: { docId: 'faq-0123', kind: 'faq', clubId: 'abc' },
        });

        expect(out).toEqual({ id: 'sm-1', status: 'queued' });
        expect(calls).toHaveLength(1);
        expect(calls[0].url).toBe('https://api.supermemory.ai/v3/documents');
        expect(calls[0].method).toBe('POST');
        expect(calls[0].headers.Authorization).toBe('Bearer key-123');
        expect(calls[0].body).toMatchObject({
            content: 'P: ¿Horario?\nR: 9 a 18h',
            containerTags: ['club_abc'],
            customId: 'faq-0123',
            taskType: 'superrag',
            metadata: { docId: 'faq-0123', kind: 'faq' },
        });
    });

    it('searches only inside the given namespace', async () => {
        const { impl, calls } = fakeFetch({ results: [], timing: 3, total: 0 });
        const transport = createSupermemoryTransport({ apiKey: 'k', fetchImpl: impl });

        await transport.search({ namespace: 'club_xyz', query: '¿cuánto cuesta?', limit: 5 });

        expect(calls[0].url).toBe('https://api.supermemory.ai/v4/search');
        expect(calls[0].body).toMatchObject({
            q: '¿cuánto cuesta?',
            containerTags: ['club_xyz'],
            limit: 5,
            searchMode: 'chunks',
        });
    });

    it('lists documents of a namespace and bulk-deletes by id within it', async () => {
        const { impl, calls } = fakeFetch({ memories: [], pagination: {} });
        const transport = createSupermemoryTransport({ apiKey: 'k', fetchImpl: impl });

        await transport.listDocuments({ namespace: 'club_a', limit: 200 });
        expect(calls[0].url).toBe('https://api.supermemory.ai/v3/documents/list');
        expect(calls[0].body).toMatchObject({ containerTags: ['club_a'] });

        const del = fakeFetch({ success: true, deletedCount: 2 });
        const t2 = createSupermemoryTransport({ apiKey: 'k', fetchImpl: del.impl });
        const out = await t2.deleteDocuments({ namespace: 'club_a', ids: ['faq-1', 'faq-2'] });
        expect(out.deletedCount).toBe(2);
        expect(del.calls[0].method).toBe('DELETE');
        expect(del.calls[0].url).toBe('https://api.supermemory.ai/v3/documents/bulk');
        expect(del.calls[0].body).toMatchObject({ ids: ['faq-1', 'faq-2'], containerTags: ['club_a'] });
    });

    it('throws a typed SupermemoryError on non-2xx responses', async () => {
        const { impl } = fakeFetch({ error: 'nope' }, 401);
        const transport = createSupermemoryTransport({ apiKey: 'bad', fetchImpl: impl });
        await expect(
            transport.search({ namespace: 'club_a', query: 'x', limit: 3 }),
        ).rejects.toBeInstanceOf(SupermemoryError);
    });

    it('supermemoryFromEnv returns null without SUPERMEMORY_API_KEY (graceful degradation)', () => {
        const prev = process.env.SUPERMEMORY_API_KEY;
        delete process.env.SUPERMEMORY_API_KEY;
        try {
            expect(supermemoryFromEnv()).toBeNull();
        } finally {
            if (prev !== undefined) process.env.SUPERMEMORY_API_KEY = prev;
        }
    });

    it('supermemoryFromEnv honors SUPERMEMORY_API_URL for the self-host exit path', async () => {
        const prevKey = process.env.SUPERMEMORY_API_KEY;
        const prevUrl = process.env.SUPERMEMORY_API_URL;
        process.env.SUPERMEMORY_API_KEY = 'k';
        process.env.SUPERMEMORY_API_URL = 'http://localhost:6767';
        const { impl, calls } = fakeFetch({ results: [], timing: 0, total: 0 });
        try {
            const transport = supermemoryFromEnv(impl);
            expect(transport).not.toBeNull();
            await transport!.search({ namespace: 'club_a', query: 'hola', limit: 1 });
            expect(calls[0].url).toBe('http://localhost:6767/v4/search');
        } finally {
            if (prevKey === undefined) delete process.env.SUPERMEMORY_API_KEY;
            else process.env.SUPERMEMORY_API_KEY = prevKey;
            if (prevUrl === undefined) delete process.env.SUPERMEMORY_API_URL;
            else process.env.SUPERMEMORY_API_URL = prevUrl;
        }
    });
});
