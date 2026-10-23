/**
 * Club knowledge layer tests (Workstream A — Supermemory memory infra).
 *
 * Pins the invariants Roger approved:
 * - One namespace per club: `club_<clubId>`; a search for club A is built
 *   ONLY from club A's namespace (isolation by construction).
 * - Supabase is the source of truth; the provider holds a derived index:
 *   `buildClubKnowledgeDocs` maps source rows to docs deterministically
 *   (stable ids), `syncClubKnowledge` upserts sources and deletes orphans,
 *   `rebuildClubKnowledge` wipes the namespace and re-ingests from source.
 * - Ingestion scope is club knowledge ONLY: FAQs, club profile (name /
 *   description / rules), and knowledge-type creator corrections. No member
 *   data exists in the source shape, so none can leak.
 * - No SUPERMEMORY_API_KEY -> provider resolves to null and every entry
 *   point degrades (search returns null, sync is a no-op).
 */
import {
    buildClubKnowledgeDocs,
    clubNamespace,
    faqDocId,
    InMemoryKnowledgeProvider,
    rebuildClubKnowledge,
    resolveKnowledgeProvider,
    searchClubKnowledge,
    SupermemoryKnowledgeProvider,
    syncClubKnowledge,
    type ClubKnowledgeSource,
    type KnowledgeSourceDb,
} from '@/lib/ai/knowledge';
import type { SupermemoryTransport } from '@/lib/ai/supermemory-client';

const CLUB_A = 'club-a-123';
const CLUB_B = 'club-b-456';

function sourceFor(overrides: Partial<ClubKnowledgeSource> = {}): ClubKnowledgeSource {
    return {
        club: {
            name: 'Club Fotografía',
            description: 'Comunidad de fotografía urbana.',
            rules: 'Respeto siempre. Nada de spam.',
            category: 'arte',
        },
        faq: [
            { q: '¿Cuánto cuesta la membresía?', a: 'Cuesta 10 USD al mes.' },
            { q: '¿Cuándo son las sesiones en vivo?', a: 'Los martes a las 19:00.' },
        ],
        corrections: [{ key: 'correction-topic', preference: 'El club abre los lunes, no los martes.' }],
        ...overrides,
    };
}

function sourceDb(source: ClubKnowledgeSource): KnowledgeSourceDb {
    return { getClubSource: async () => source };
}

describe('clubNamespace', () => {
    it('derives one namespace per club', () => {
        expect(clubNamespace(CLUB_A)).toBe('club_club-a-123');
        expect(clubNamespace(CLUB_B)).toBe('club_club-b-456');
        expect(clubNamespace(CLUB_A)).not.toBe(clubNamespace(CLUB_B));
    });

    it('sanitizes characters that are unsafe in a namespace', () => {
        expect(clubNamespace('a/b c.d')).toBe('club_a-b-c-d');
    });
});

describe('buildClubKnowledgeDocs (ingestion mapping)', () => {
    it('maps FAQ entries, the club profile and corrections to stable-id docs', () => {
        const docs = buildClubKnowledgeDocs(CLUB_A, sourceFor());
        expect(docs).toHaveLength(4);

        const faqDoc = docs.find((d) => d.id === faqDocId('¿Cuánto cuesta la membresía?'));
        expect(faqDoc).toBeDefined();
        expect(faqDoc!.kind).toBe('faq');
        expect(faqDoc!.clubId).toBe(CLUB_A);
        expect(faqDoc!.content).toContain('¿Cuánto cuesta la membresía?');
        expect(faqDoc!.content).toContain('10 USD al mes');

        const profile = docs.find((d) => d.kind === 'club_profile');
        expect(profile!.content).toContain('Club Fotografía');
        expect(profile!.content).toContain('Respeto siempre');

        const correction = docs.find((d) => d.kind === 'correction');
        expect(correction!.content).toContain('abre los lunes');
    });

    it('is deterministic: same source -> same doc ids and hashes', () => {
        const a = buildClubKnowledgeDocs(CLUB_A, sourceFor());
        const b = buildClubKnowledgeDocs(CLUB_A, sourceFor());
        expect(a.map((d) => d.id)).toEqual(b.map((d) => d.id));
        expect(a.map((d) => d.hash)).toEqual(b.map((d) => d.hash));
    });

    it('changes the faq doc id when the question changes (edit = new doc, old one orphaned)', () => {
        expect(faqDocId('¿Precio?')).not.toBe(faqDocId('¿Precio nuevo?'));
    });

    it('omits the profile doc when the club has no profile content', () => {
        const docs = buildClubKnowledgeDocs(CLUB_A, sourceFor({ club: null }));
        expect(docs.some((d) => d.kind === 'club_profile')).toBe(false);
    });

    it('redacts PII from corrections before they can be ingested', () => {
        const docs = buildClubKnowledgeDocs(
            CLUB_A,
            sourceFor({
                corrections: [
                    { key: 'correction-topic', preference: 'Escríbeme a creador@club.com para dudas.' },
                ],
            }),
        );
        const correction = docs.find((d) => d.kind === 'correction');
        expect(correction!.content).not.toContain('creador@club.com');
        expect(correction!.content).toContain('[redacted-email]');
    });
});

describe('InMemoryKnowledgeProvider isolation', () => {
    it('a search for club A never returns club B documents', async () => {
        const provider = new InMemoryKnowledgeProvider();
        await provider.ingest(CLUB_A, buildClubKnowledgeDocs(CLUB_A, sourceFor()));
        await provider.ingest(
            CLUB_B,
            buildClubKnowledgeDocs(
                CLUB_B,
                sourceFor({
                    club: { name: 'Club Cocina', description: 'Recetas.', rules: '', category: 'cocina' },
                    faq: [{ q: '¿Cuánto cuesta la membresía?', a: 'Cuesta 99 USD, secreto de cocina.' }],
                }),
            ),
        );

        const hits = await provider.search(CLUB_A, '¿cuánto cuesta la membresía?', { limit: 5 });
        expect(hits.length).toBeGreaterThan(0);
        expect(hits.every((h) => !h.content.includes('secreto de cocina'))).toBe(true);
        expect(hits[0].content).toContain('10 USD');
    });

    it('kind filter keeps corrections out of FAQ grounding', async () => {
        const provider = new InMemoryKnowledgeProvider();
        await provider.ingest(CLUB_A, buildClubKnowledgeDocs(CLUB_A, sourceFor()));
        const hits = await provider.search(CLUB_A, '¿cuándo abre el club?', {
            kinds: ['faq', 'club_profile'],
            limit: 5,
        });
        expect(hits.every((h) => h.kind !== 'correction')).toBe(true);
    });
});

describe('SupermemoryKnowledgeProvider over a fake transport', () => {
    function fakeTransport() {
        const calls: { method: string; namespace: string }[] = [];
        const store = new Map<string, Map<string, string>>(); // ns -> customId -> content
        const transport: SupermemoryTransport = {
            async addDocument({ namespace, customId, content }) {
                calls.push({ method: 'add', namespace });
                if (!store.has(namespace)) store.set(namespace, new Map());
                store.get(namespace)!.set(customId, content);
                return { id: `sm-${customId}`, status: 'queued' };
            },
            async search({ namespace, query }) {
                calls.push({ method: 'search', namespace });
                const docs = store.get(namespace) ?? new Map();
                const results = [...docs.entries()]
                    .filter(([, content]) =>
                        content.toLowerCase().includes(query.toLowerCase().split(' ')[0] ?? ''),
                    )
                    .map(([customId, content]) => ({
                        customId,
                        metadata: { docId: customId },
                        chunks: [{ content, score: 0.9 }],
                    }));
                return { results };
            },
            async listDocuments({ namespace }) {
                calls.push({ method: 'list', namespace });
                const docs = store.get(namespace) ?? new Map();
                return { documents: [...docs.keys()].map((customId) => ({ id: customId, customId })) };
            },
            async deleteDocuments({ namespace, ids }) {
                calls.push({ method: 'delete', namespace });
                const docs = store.get(namespace);
                let deletedCount = 0;
                for (const id of ids) if (docs?.delete(id)) deletedCount++;
                return { deletedCount };
            },
        };
        return { transport, calls, store };
    }

    it('ingests into the club namespace only and searches it back', async () => {
        const { transport, calls } = fakeTransport();
        const provider = new SupermemoryKnowledgeProvider(transport);
        await provider.ingest(CLUB_A, buildClubKnowledgeDocs(CLUB_A, sourceFor()));
        expect(calls.every((c) => c.namespace === clubNamespace(CLUB_A))).toBe(true);

        const hits = await provider.search(CLUB_A, '¿cuánto cuesta', { limit: 5 });
        expect(hits.length).toBeGreaterThan(0);
        expect(hits[0].docId).toBe(faqDocId('¿Cuánto cuesta la membresía?'));
    });
});

describe('syncClubKnowledge / rebuildClubKnowledge', () => {
    it('sync upserts all source docs and deletes orphans left by edits', async () => {
        const provider = new InMemoryKnowledgeProvider();
        const deps = { provider, source: sourceDb(sourceFor()) };

        const first = await syncClubKnowledge(CLUB_A, deps);
        expect(first).toEqual({ skipped: false, ingested: 4, removed: 0 });

        // Creator edits one FAQ question and deletes the correction.
        const edited = sourceFor({
            faq: [
                { q: '¿Cuál es el precio de la membresía?', a: 'Cuesta 10 USD al mes.' },
                { q: '¿Cuándo son las sesiones en vivo?', a: 'Los martes a las 19:00.' },
            ],
            corrections: [],
        });
        const second = await syncClubKnowledge(CLUB_A, { provider, source: sourceDb(edited) });
        expect(second.ingested).toBe(3);
        expect(second.removed).toBe(2); // old faq doc + correction doc

        const ids = await provider.listDocIds(CLUB_A);
        expect(ids).toContain(faqDocId('¿Cuál es el precio de la membresía?'));
        expect(ids).not.toContain(faqDocId('¿Cuánto cuesta la membresía?'));
    });

    it('rebuild wipes the namespace and re-ingests from the Supabase source', async () => {
        const provider = new InMemoryKnowledgeProvider();
        await provider.ingest(CLUB_A, [
            {
                id: 'stale-doc',
                clubId: CLUB_A,
                kind: 'faq',
                title: 'stale',
                content: 'contenido viejo',
                hash: 'x',
            },
        ]);
        const out = await rebuildClubKnowledge(CLUB_A, { provider, source: sourceDb(sourceFor()) });
        expect(out).toEqual({ skipped: false, ingested: 4 });
        const ids = await provider.listDocIds(CLUB_A);
        expect(ids).not.toContain('stale-doc');
        expect(ids).toHaveLength(4);
    });

    it('degrades to a no-op when no provider is configured (no API key)', async () => {
        const out = await syncClubKnowledge(CLUB_A, { provider: null, source: sourceDb(sourceFor()) });
        expect(out).toEqual({ skipped: true, ingested: 0, removed: 0 });
        const hits = await searchClubKnowledge(CLUB_A, 'precio', {}, { provider: null });
        expect(hits).toBeNull();
    });
});

describe('resolveKnowledgeProvider', () => {
    it('returns the injected provider first, null when nothing is configured', () => {
        const provider = new InMemoryKnowledgeProvider();
        expect(resolveKnowledgeProvider({ provider })).toBe(provider);
        const prev = process.env.SUPERMEMORY_API_KEY;
        delete process.env.SUPERMEMORY_API_KEY;
        try {
            expect(resolveKnowledgeProvider({})).toBeNull();
            expect(resolveKnowledgeProvider()).toBeNull();
        } finally {
            if (prev !== undefined) process.env.SUPERMEMORY_API_KEY = prev;
        }
    });
});
