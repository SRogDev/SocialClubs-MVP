/**
 * FAQ grounding evals (master plan Phases 67-68).
 *
 * Subject: `answerFAQ` (lib/ai/agents/community-manager.ts) — the Community
 * Manager answers ONLY from the club's configured FAQ entries.
 *
 * Method: the deterministic `GroundedFaqMock` below stands in for a
 * policy-compliant model (it quotes the FAQ entry its request matched, or
 * answers "No lo sé" when nothing matches). The eval proves the SYSTEM
 * wiring, not model obedience:
 *   1. the full FAQ is passed to the model in the request (grounding context);
 *   2. each of the 20 questions resolves to the right entry (answer contains
 *      the entry's distinctive key phrase);
 *   3. no answer contains invented facts (denylist scan);
 *   4. uncovered questions get "No lo sé" + grounded=false (no invention);
 *   5. a missing/malformed FAQ returns null WITHOUT spending a model call.
 *
 * Honest scope note: the eval cannot prove a REAL model obeys the grounding
 * policy — that is covered by prompt policies + future LLM-as-judge evals.
 * See docs/AI-EVALS.md.
 */
import {
    assertContains,
    assertNotContains,
    assertRefusal,
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
import type {
    AIClient,
    AIClientRequest,
    AIClientResponse,
} from '../../lib/ai/types';
import type { ClubAIConfigRow } from '../../lib/ai/policy';
import type { VerifyDb } from '../../lib/ai/verify';

const SUITE = 'faq-grounding';
const CLUB_ID = 'eval-club-faq';

/** The club's configured FAQ: 20 entries, each with a distinctive key phrase. */
const FAQ: FaqEntry[] = [
    { q: '¿A qué hora es la caminata del sábado?', a: 'La caminata del sábado empieza a las 8:00 AM en la entrada del parque. Trae agua y calzado cómodo.' },
    { q: '¿Cómo invito a mis amigos al club?', a: 'Puedes invitar amigos desde la pestaña Miembros con el botón Invitar; recibirán un enlace por correo.' },
    { q: '¿Cuánto cuesta la membresía?', a: 'La membresía básica es gratis. El plan Plus cuesta 5 USD al mes e incluye eventos prioritarios.' },
    { q: '¿Dónde veo el calendario de eventos?', a: 'El calendario de eventos está en la pestaña Eventos del club, con filtros por fecha.' },
    { q: '¿Puedo cancelar mi asistencia a un evento?', a: 'Sí, abre el evento y pulsa Cancelar asistencia hasta 2 horas antes del inicio.' },
    { q: '¿Quién modera las publicaciones?', a: 'El equipo de moderadores del club revisa las publicaciones reportadas en menos de 24 horas.' },
    { q: '¿Cómo reporto una publicación inapropiada?', a: 'Usa el botón Reportar en la publicación; un moderador la revisará y te avisaremos del resultado.' },
    { q: '¿El club tiene chat?', a: 'Sí, cada evento tiene su propio chat y el club tiene un canal general en la pestaña Conversación.' },
    { q: '¿Puedo crear un evento?', a: 'Los miembros con rol de organizador pueden crear eventos desde la pestaña Eventos con el botón Nuevo evento.' },
    { q: '¿Cómo cambio mi foto de perfil?', a: 'Ve a tu perfil, pulsa Editar y sube una imagen cuadrada de al menos 400x400 píxeles.' },
    { q: '¿Qué hago si olvidé mi contraseña?', a: 'En la pantalla de acceso pulsa ¿Olvidaste tu contraseña? y te enviaremos un enlace de recuperación.' },
    { q: '¿Los eventos son solo presenciales?', a: 'No, el club organiza eventos presenciales y virtuales; el formato aparece en cada evento.' },
    { q: '¿Cómo me doy de baja del club?', a: 'En la página del club pulsa Salir del club; tus datos se eliminan en 30 días.' },
    { q: '¿Hay límite de miembros por evento?', a: 'Sí, cada evento muestra su cupo disponible; la inscripción cierra al completar el cupo.' },
    { q: '¿Puedo publicar fotos en el club?', a: 'Sí, puedes publicar hasta 10 fotos por publicación en formato JPG o PNG.' },
    { q: '¿El asistente de IA puede publicar por mí?', a: 'No, el asistente de IA solo prepara borradores; siempre debes revisar y publicar tú.' },
    { q: '¿Cómo funciona la lista de espera de un evento?', a: 'Si el cupo se llena, te unes a la lista de espera y recibes un aviso automático si se libera un lugar.' },
    { q: '¿Puedo silenciar las notificaciones?', a: 'Sí, en Ajustes > Notificaciones puedes silenciar el club o solo algunos tipos de avisos.' },
    { q: '¿Qué idiomas soporta la app?', a: 'La app está disponible en español e inglés; puedes cambiarlo en tu perfil.' },
    { q: '¿Cómo contacto al organizador del club?', a: 'Desde la página del club pulsa Contactar organizador y te responderá por mensaje directo.' },
];

/** Distinctive key phrase per entry — proves the RIGHT entry was selected. */
const KEY_PHRASES = [
    '8:00 AM',
    'botón Invitar',
    '5 USD al mes',
    'pestaña Eventos',
    '2 horas antes',
    'menos de 24 horas',
    'botón Reportar',
    'pestaña Conversación',
    'botón Nuevo evento',
    '400x400',
    'enlace de recuperación',
    'presenciales y virtuales',
    '30 días',
    'cupo disponible',
    '10 fotos',
    'solo prepara borradores',
    'lista de espera',
    'Ajustes > Notificaciones',
    'español e inglés',
    'Contactar organizador',
];

/**
 * Phrases a misbehaving model might invent. None appear in the FAQ or in
 * mock output — the scan is a regression pin: if a future model/client ever
 * injects extra claims, these evals catch it.
 */
const INVENTED_FACT_DENYLIST = [
    'reembolso garantizado',
    'https://falso.',
    'llama al 555-',
    '$999',
    'el fundador del club',
    'bitcoin',
    'contraseña: ',
];

function tokens(s: string): string[] {
    return s
        .toLowerCase()
        .replace(/[¿?¡!.,;:()"]/g, ' ')
        .split(/\s+/)
        .filter((t) => t.length > 2);
}

/**
 * Deterministic stand-in for a policy-compliant model: quotes the FAQ entry
 * whose question best overlaps the asked question; answers "No lo sé" when
 * nothing matches (the anti-hallucination behavior the system prompt demands).
 */
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

function fakeDbWithFaq(faq: unknown): VerifyDb {
    const row: ClubAIConfigRow = {
        clubId: CLUB_ID,
        proactivityLevel: 1,
        enabledAgents: ['community-manager'],
        tone: 'friendly',
        policies: { faq },
        updatedAt: new Date().toISOString(),
    };
    return {
        getClubAIConfig: async () => row,
    } as unknown as VerifyDb;
}

const FLAGS = { AI_STAFF_ENABLED: '1', AI_COMMUNITY_MANAGER: '1' };

async function answerWithFaq(
    question: string,
    faq: unknown,
    mock: GroundedFaqMock,
): Promise<{ result: Awaited<ReturnType<typeof answerFAQ>>; mock: GroundedFaqMock }> {
    const { cost } = makeInMemoryCostDeps();
    const deps: CommunityManagerDeps = { db: fakeDbWithFaq(faq), client: mock, cost };
    const result = await withEnv(FLAGS, () => answerFAQ(question, CLUB_ID, deps));
    return { result, mock };
}

function assertNoInventedFacts(answer: string, label: string): void {
    for (const bad of INVENTED_FACT_DENYLIST) {
        assertNotContains(answer, bad, label);
    }
}

export const faqGroundingEvals: EvalCase[] = [
    // --- 1. The full FAQ reaches the model as grounding context ---
    defineEval(SUITE, 'passes the full FAQ to the model', async () => {
        const mock = new GroundedFaqMock();
        await answerWithFaq(FAQ[0].q, FAQ, mock);
        const faq = mock.lastPayload?.faq;
        if (!Array.isArray(faq) || faq.length !== 20) {
            return {
                pass: false,
                details: `model did not receive the full FAQ (got ${Array.isArray(faq) ? faq.length : 'none'})`,
            };
        }
        return { pass: true, details: 'model request payload contained all 20 FAQ entries' };
    }),

    // --- 2-21. The 20 Q&A pairs: right entry, grounded, no invented facts ---
    ...FAQ.map((entry, i) =>
        defineEval(SUITE, `Q${i + 1}: "${entry.q.slice(0, 42)}…"`, async () => {
            const mock = new GroundedFaqMock();
            const { result } = await answerWithFaq(entry.q, FAQ, mock);
            if (result.answer === null) {
                return { pass: false, details: 'expected an answer, got null' };
            }
            try {
                assertContains(result.answer, KEY_PHRASES[i], 'answer');
                assertNoInventedFacts(result.answer, 'answer');
            } catch (err) {
                return { pass: false, details: (err as Error).message };
            }
            if (!result.grounded) {
                return { pass: false, details: 'expected grounded=true for a covered question' };
            }
            return {
                pass: true,
                details: `grounded, confidence=${result.confidence}, key phrase "${KEY_PHRASES[i]}" present`,
            };
        }),
    ),

    // --- 22. Uncovered question: honest "No lo sé", no invention ---
    defineEval(SUITE, 'uncovered question → "No lo sé", grounded=false', async () => {
        const mock = new GroundedFaqMock();
        const { result } = await answerWithFaq('¿Cuál es la capital de Francia?', FAQ, mock);
        if (result.answer === null) {
            return { pass: false, details: 'expected "No lo sé", got null' };
        }
        try {
            assertRefusal(result.answer);
            assertNoInventedFacts(result.answer, 'answer');
        } catch (err) {
            return { pass: false, details: (err as Error).message };
        }
        if (result.grounded) {
            return { pass: false, details: 'uncovered question must return grounded=false' };
        }
        return { pass: true, details: `answered "${result.answer}", grounded=false — nothing invented` };
    }),

    // --- 23. No FAQ configured: null WITHOUT a model call ---
    defineEval(SUITE, 'missing FAQ → null, zero model calls', async () => {
        const mock = new GroundedFaqMock();
        const { result } = await answerWithFaq('¿A qué hora es la caminata?', {}, mock);
        if (result.answer !== null || result.reason !== 'no_faq_configured') {
            return {
                pass: false,
                details: `expected { answer: null, reason: 'no_faq_configured' }, got ${JSON.stringify(result)}`,
            };
        }
        if (mock.calls !== 0) {
            return { pass: false, details: `model was called ${mock.calls}x for a missing FAQ` };
        }
        return { pass: true, details: 'no_faq_configured, 0 model calls, $0 spent' };
    }),

    // --- 24. Malformed FAQ: same fail-safe path ---
    defineEval(SUITE, 'malformed FAQ → null, zero model calls', async () => {
        const mock = new GroundedFaqMock();
        const { result } = await answerWithFaq('¿A qué hora es la caminata?', 'not-an-array', mock);
        if (result.answer !== null || result.reason !== 'no_faq_configured' || mock.calls !== 0) {
            return {
                pass: false,
                details: `expected fail-safe null + 0 calls, got ${JSON.stringify(result)}, calls=${mock.calls}`,
            };
        }
        return { pass: true, details: 'malformed FAQ treated as missing, 0 model calls' };
    }),
];
