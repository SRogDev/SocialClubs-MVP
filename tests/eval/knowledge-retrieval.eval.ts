/**
 * Knowledge-retrieval evals (Workstream A — Supermemory memory infra).
 *
 * Subject: `answerFAQ` with the club knowledge layer active. The provider
 * under test is the deterministic `InMemoryKnowledgeProvider` — the same
 * KnowledgeProvider interface the Supermemory provider implements — so
 * these evals exercise the REAL retrieval wiring (namespace scoping, kind
 * filtering, grounding selection, fallback) with zero network and $0.
 *
 * What is proven here (system wiring, not model obedience — same honest
 * scope as faq-grounding):
 *   1. retrieval narrows the grounding set to relevant FAQ entries
 *      (no more whole-FAQ stuffing when the provider is active);
 *   2. answers still resolve to the right entry's key phrase;
 *   3. namespace isolation: club A can never be grounded in club B's FAQ,
 *      even for an identical question with a different answer;
 *   4. provider disabled -> fallback to the full FAQ (previous behavior);
 *   5. uncovered questions still get an honest "No lo sé";
 *   6. after a source edit + sync, retrieval serves the UPDATED answer
 *      (Supabase is the source of truth; the index converges).
 */
import {
    assertContains,
    assertNotContains,
    defineEval,
    makeInMemoryCostDeps,
    withEnv,
    type EvalCase,
} from '../../lib/ai/eval-harness';
import {
    answerFAQ,
    type CommunityManagerDeps,
    type FaqEntry,
} from '../../lib/ai/agents/community-manager';
import {
    buildClubKnowledgeDocs,
    InMemoryKnowledgeProvider,
    syncClubKnowledge,
    type ClubKnowledgeSource,
    type KnowledgeSourceDb,
} from '../../lib/ai/knowledge';
import type {
    AIClient,
    AIClientRequest,
    AIClientResponse,
} from '../../lib/ai/types';
import type { ClubAIConfigRow } from '../../lib/ai/policy';
import type { VerifyDb } from '../../lib/ai/verify';

const SUITE = 'knowledge-retrieval';
const CLUB_A = 'eval-club-a';
const CLUB_B = 'eval-club-b';

const FAQ_A: FaqEntry[] = [
    { q: '¿Cuánto cuesta la membresía?', a: 'La membresía del club A cuesta 5 USD al mes.' },
    { q: '¿Cuándo son los eventos?', a: 'Los eventos del club A son los viernes a las 6pm.' },
    { q: '¿Cómo invito a mis amigos?', a: 'Invita amigos desde la pestaña Miembros del club A.' },
    { q: '¿Dónde veo el calendario?', a: 'El calendario está en la pestaña Eventos del club A.' },
    { q: '¿Puedo cancelar mi asistencia?', a: 'Cancela tu asistencia hasta 2 horas antes en el club A.' },
];

/** Same question, different (secret) answer — the isolation tripwire. */
const FAQ_B: FaqEntry[] = [
    { q: '¿Cuánto cuesta la membresía?', a: 'La membresía del club B cuesta 999 USD, precio secreto B.' },
    { q: '¿Cuándo son los eventos?', a: 'Los eventos del club B son los domingos a las 9am.' },
];

function tokens(s: string): string[] {
    return s
        .toLowerCase()
        .replace(/[¿?¡!.,;:()"]/g, ' ')
        .split(/\s+/)
        .filter((t) => t.length > 2);
}

/** Same deterministic stand-in model as faq-grounding (threshold 0.3). */
class GroundedFaqMock implements AIClient {
    readonly mock = true;
    calls = 0;
    lastPayload: { question?: string; faq?: FaqEntry[] } | null = null;

    async chat(req: AIClientRequest): Promise<AIClientResponse> {
        this.calls += 1;
        const userMsg = req.messages[req.messages.length - 1];
        const parsed = JSON.parse(userMsg.content) as {
            payload?: { question?: string; faq?: FaqEntry[] };
        };
        const payload = parsed.payload ?? {};
        this.lastPayload = payload;
        const question = String(payload.question ?? '');
        const entries = Array.isArray(payload.faq) ? payload.faq : [];

        const qToks = new Set(tokens(question));
        let best: FaqEntry | null = null;
        let bestScore = 0;
        for (const e of entries) {
            const eToks = tokens(e.q);
            const overlap = eToks.filter((t) => qToks.has(t)).length;
            const score = eToks.length > 0 ? overlap / eToks.length : 0;
            if (score > bestScore) {
                bestScore = score;
                best = e;
            }
        }
        const out =
            best && bestScore >= 0.3
                ? { answer: best.a, grounded: true, confidence: 0.92 }
                : { answer: 'No lo sé', grounded: false, confidence: 0.1 };
        return {
            content: JSON.stringify(out),
            usage: { promptTokens: 0, completionTokens: 0 },
        };
    }
}

function fakeDbWithFaq(clubId: string, faq: FaqEntry[]): VerifyDb {
    const row: ClubAIConfigRow = {
        clubId,
        proactivityLevel: 1,
        enabledAgents: ['community-manager'],
        tone: 'friendly',
        policies: { faq },
        updatedAt: new Date().toISOString(),
    };
    return { getClubAIConfig: async () => row } as unknown as VerifyDb;
}

const FLAGS = { AI_STAFF_ENABLED: '1', AI_COMMUNITY_MANAGER: '1' };

async function seededProvider(): Promise<InMemoryKnowledgeProvider> {
    const provider = new InMemoryKnowledgeProvider();
    await provider.ingest(
        CLUB_A,
        buildClubKnowledgeDocs(CLUB_A, { club: null, faq: FAQ_A, corrections: [] }),
    );
    await provider.ingest(
        CLUB_B,
        buildClubKnowledgeDocs(CLUB_B, { club: null, faq: FAQ_B, corrections: [] }),
    );
    return provider;
}

async function answer(
    question: string,
    clubId: string,
    faq: FaqEntry[],
    provider: InMemoryKnowledgeProvider | null,
): Promise<{ result: Awaited<ReturnType<typeof answerFAQ>>; mock: GroundedFaqMock }> {
    const mock = new GroundedFaqMock();
    const { cost } = makeInMemoryCostDeps();
    const deps: CommunityManagerDeps = {
        db: fakeDbWithFaq(clubId, faq),
        client: mock,
        cost,
        knowledge: { provider },
    };
    const result = await withEnv(FLAGS, () => answerFAQ(question, clubId, deps));
    return { result, mock };
}

export const knowledgeRetrievalEvals: EvalCase[] = [
    defineEval(SUITE, 'retrieval narrows grounding to relevant entries (no full-FAQ stuffing)', async () => {
        const provider = await seededProvider();
        const { mock } = await answer('¿Cuánto cuesta la membresía?', CLUB_A, FAQ_A, provider);
        const faq = mock.lastPayload?.faq;
        if (!Array.isArray(faq) || faq.length === 0 || faq.length >= FAQ_A.length) {
            return {
                pass: false,
                details: `expected a narrowed grounding set, got ${Array.isArray(faq) ? faq.length : 'none'} entries`,
            };
        }
        if (!faq.some((e) => e.q === '¿Cuánto cuesta la membresía?')) {
            return { pass: false, details: 'the relevant entry was not in the grounding set' };
        }
        return { pass: true, details: `grounding narrowed from ${FAQ_A.length} to ${faq.length} entries` };
    }),

    defineEval(SUITE, 'retrieved grounding resolves to the right answer', async () => {
        const provider = await seededProvider();
        const { result } = await answer('¿Cuánto cuesta la membresía?', CLUB_A, FAQ_A, provider);
        assertContains(result.answer ?? '', '5 USD al mes', 'answer');
        if (!result.grounded) return { pass: false, details: 'answer was not grounded' };
        return { pass: true, details: 'answer quotes the retrieved entry' };
    }),

    defineEval(SUITE, 'namespace isolation: club A never sees club B knowledge', async () => {
        const provider = await seededProvider();
        const { result } = await answer('¿Cuánto cuesta la membresía?', CLUB_A, FAQ_A, provider);
        assertNotContains(result.answer ?? '', '999 USD', 'answer');
        assertNotContains(result.answer ?? '', 'secreto B', 'answer');
        assertContains(result.answer ?? '', '5 USD al mes', 'answer');
        return { pass: true, details: 'identical question, club A answer only' };
    }),

    defineEval(SUITE, 'provider disabled -> full-FAQ fallback (previous behavior preserved)', async () => {
        const { mock } = await answer('¿Cuánto cuesta la membresía?', CLUB_A, FAQ_A, null);
        const faq = mock.lastPayload?.faq;
        if (!Array.isArray(faq) || faq.length !== FAQ_A.length) {
            return {
                pass: false,
                details: `expected the full FAQ as fallback, got ${Array.isArray(faq) ? faq.length : 'none'}`,
            };
        }
        return { pass: true, details: 'all entries reached the model without a provider' };
    }),

    defineEval(SUITE, 'uncovered question -> honest "No lo sé" with retrieval active', async () => {
        const provider = await seededProvider();
        const { result } = await answer('¿Quién ganó el mundial de 1986?', CLUB_A, FAQ_A, provider);
        if (result.grounded || result.answer !== 'No lo sé') {
            return { pass: false, details: `expected refusal, got: ${result.answer}` };
        }
        return { pass: true, details: 'no grounding invented for an uncovered question' };
    }),

    defineEval(SUITE, 'source edit + sync -> retrieval serves the updated answer', async () => {
        const provider = new InMemoryKnowledgeProvider();
        const sourceV1: ClubKnowledgeSource = { club: null, faq: FAQ_A, corrections: [] };
        const sourceDb: KnowledgeSourceDb = { getClubSource: async () => sourceV1 };
        await syncClubKnowledge(CLUB_A, { provider, source: sourceDb });

        const edited: FaqEntry[] = FAQ_A.map((e) =>
            e.q === '¿Cuánto cuesta la membresía?'
                ? { ...e, a: 'La membresía del club A ahora cuesta 7 USD al mes.' }
                : e,
        );
        const sourceDb2: KnowledgeSourceDb = {
            getClubSource: async () => ({ club: null, faq: edited, corrections: [] }),
        };
        await syncClubKnowledge(CLUB_A, { provider, source: sourceDb2 });

        const { result } = await answer('¿Cuánto cuesta la membresía?', CLUB_A, edited, provider);
        assertContains(result.answer ?? '', '7 USD al mes', 'answer');
        assertNotContains(result.answer ?? '', '5 USD al mes', 'answer');
        return { pass: true, details: 'index converged to the edited source answer' };
    }),
];
