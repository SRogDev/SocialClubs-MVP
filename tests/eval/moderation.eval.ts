/**
 * Moderation evals (master plan Phases 67-68).
 *
 * Subject: `classifyContent` (lib/ai/moderation.ts) — the layered pipeline.
 * 30 texts: 10 clean, 10 spam, 10 hate/harassment.
 *
 *   - clean → verdict 'clean' at the deterministic layer (no AI spend);
 *   - blocklist spam / hate → 'violation' caught deterministically;
 *   - link-spam / all-caps → 'suspicious' routed to the AI layer
 *     (layer === 'ai' proves the L2 classifier was consulted).
 *
 * The hate/harassment texts use placeholder tokens ('slurword',
 * 'grupo-inferior') added to a custom blocklist — no real hate speech
 * appears anywhere in this file. The deterministic mock stands in for the
 * L2 classifier (its verdict is mock-determined; the eval asserts ROUTING,
 * not the mock's verdict).
 */
import {
    defineEval,
    withEnv,
    type EvalCase,
} from '../../lib/ai/eval-harness';
import {
    classifyContent,
    DEFAULT_MODERATION_POLICY,
    REASON_BLOCKLIST,
    type ModerationPolicy,
} from '../../lib/ai/moderation';
import { MockAIClient } from '../../lib/ai/mock-client';

const SUITE = 'moderation';
const CLUB_ID = 'eval-club-mod';
const FLAGS = { AI_STAFF_ENABLED: '1', AI_MODERATION: '1' };

/** Placeholder tokens for the hate/harassment set — never real slurs. */
const HATE_POLICY: Partial<ModerationPolicy> = {
    blocklist: [...DEFAULT_MODERATION_POLICY.blocklist, 'slurword', 'grupo-inferior'],
};

const CLEAN: string[] = [
    '¡Nos vemos el sábado en la caminata! Traigan agua y bloqueador.',
    'Great meetup yesterday, thanks to everyone who joined the photo walk!',
    '¿Alguien tiene la receta del ponche que tomamos en la fiesta?',
    'Recordatorio: la cuota del club se paga antes del día 5 de cada mes.',
    'I loved the talk about urban gardening — when is the next one?',
    'Fotos del evento de anoche ya están en el álbum compartido 📸',
    '¿Quién se apunta al torneo de dominó del viernes?',
    'The new members channel is very welcoming, glad I joined.',
    'Mañana limpiamos el parque a las 9, ¡traigan guantes!',
    'Does anyone know if the workshop includes materials?',
];

const SPAM_BLOCKLIST: string[] = [
    'Buy followers cheap, click here now for instant fame!',
    'CRYPTO GIVEAWAY!!! Send 0.1 BTC and get 1 BTC back, make money fast!',
    'Hola, gana dinero facil desde casa, escríbeme por privado',
    'Free viagra, best prices, click here now!!!',
    'Comprar seguidores baratos y reales, oferta por tiempo limitado',
];

const SPAM_SUSPICIOUS: Array<{ text: string; reasonPrefix: string }> = [
    {
        text: 'Mira estas ofertas https://a.com/x https://b.com/y https://c.com/z https://d.com/w imperdibles',
        reasonPrefix: 'link-spam:',
    },
    {
        text: 'https://t.co/1 https://t.co/2 https://t.co/3 https://t.co/4 https://t.co/5',
        reasonPrefix: 'link-spam:',
    },
    {
        text: 'Check my profiles: https://a.io https://b.io https://c.io https://d.io for more info',
        reasonPrefix: 'link-spam:',
    },
    {
        text: 'ATENCIÓN COMPAÑEROS ESTA ES UNA NOTIFICACIÓN MUY IMPORTANTE PARA TODOS USTEDES',
        reasonPrefix: 'all-caps:',
    },
    {
        text: 'URGENT MESSAGE FOR ALL CLUB MEMBERS PLEASE READ THIS RIGHT NOW TODAY',
        reasonPrefix: 'all-caps:',
    },
];

const HATE_PLACEHOLDER: string[] = [
    'La gente como tú es un slurword, fuera de este club',
    'Todos los del grupo-inferior deberían irse de aquí',
    'Eres un slurword y nadie te quiere en el grupo',
    'No queremos slurword en nuestros eventos, lárgate',
    'Tu opinión no vale nada, slurword',
    'Los grupo-inferior siempre arruinan todo',
    'Cállate slurword, nadie te invitó',
    'Odio a los slurword de este club',
    'Fuera grupo-inferior, este lugar no es para ustedes',
    'Maldito slurword, deja de publicar',
];

async function classify(text: string, policy?: Partial<ModerationPolicy>) {
    const client = new MockAIClient();
    return withEnv(FLAGS, () =>
        classifyContent(text, {
            clubId: CLUB_ID,
            policy,
            deps: { invoke: { client } },
        }),
    );
}

export const moderationEvals: EvalCase[] = [
    // --- 10 clean: pass at the deterministic layer, zero AI spend ---
    ...CLEAN.map((text, i) =>
        defineEval(SUITE, `clean #${i + 1} passes`, async () => {
            const res = await classify(text);
            if (res.verdict !== 'clean') {
                return { pass: false, details: `verdict=${res.verdict} (reasons: ${res.reasons.join(',')}) for ${JSON.stringify(text.slice(0, 50))}` };
            }
            if (res.layer !== 'deterministic') {
                return { pass: false, details: `clean text reached layer=${res.layer} — wasted AI call` };
            }
            return { pass: true, details: 'clean @ deterministic layer' };
        }),
    ),

    // --- 5 spam: blocklist violations caught deterministically ---
    ...SPAM_BLOCKLIST.map((text, i) =>
        defineEval(SUITE, `spam blocklist #${i + 1} → violation`, async () => {
            const res = await classify(text);
            if (res.verdict !== 'violation' || res.layer !== 'deterministic') {
                return { pass: false, details: `expected violation@deterministic, got ${res.verdict}@${res.layer}` };
            }
            if (!res.reasons.includes(REASON_BLOCKLIST)) {
                return { pass: false, details: `missing '${REASON_BLOCKLIST}' reason (got: ${res.reasons.join(',')})` };
            }
            return { pass: true, details: `violation, reason=${REASON_BLOCKLIST}` };
        }),
    ),

    // --- 5 spam: suspicious → routed to the AI layer ---
    ...SPAM_SUSPICIOUS.map(({ text, reasonPrefix }, i) =>
        defineEval(SUITE, `spam suspicious #${i + 1} → AI layer`, async () => {
            const res = await classify(text);
            if (res.layer !== 'ai') {
                return { pass: false, details: `suspicious text never reached the AI layer (layer=${res.layer}, verdict=${res.verdict})` };
            }
            if (!res.reasons.some((r) => r.startsWith(reasonPrefix))) {
                return { pass: false, details: `deterministic reason '${reasonPrefix}*' lost (reasons: ${res.reasons.join(',')})` };
            }
            return { pass: true, details: `reached AI layer (L2 verdict=${res.verdict} is mock-determined)` };
        }),
    ),

    // --- 10 hate/harassment (placeholder tokens): deterministic violations ---
    ...HATE_PLACEHOLDER.map((text, i) =>
        defineEval(SUITE, `hate placeholder #${i + 1} → violation`, async () => {
            const res = await classify(text, HATE_POLICY);
            if (res.verdict !== 'violation' || res.layer !== 'deterministic') {
                return { pass: false, details: `expected violation@deterministic, got ${res.verdict}@${res.layer} for ${JSON.stringify(text.slice(0, 40))}` };
            }
            if (!res.reasons.includes(REASON_BLOCKLIST)) {
                return { pass: false, details: `missing '${REASON_BLOCKLIST}' reason (got: ${res.reasons.join(',')})` };
            }
            return { pass: true, details: `violation, reason=${REASON_BLOCKLIST}` };
        }),
    ),
];
