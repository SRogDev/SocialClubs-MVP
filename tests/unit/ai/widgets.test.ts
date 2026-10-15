/**
 * Tests for the typed widget runtime (master plan Phases 53-57).
 *
 * v1 rule: widgets are TYPED CONFIGS ONLY — never arbitrary codegen.
 * Every config is validated by zod before it is stored or rendered;
 * unknown widget types are rejected at creation and render a fallback
 * in the feed (never crash).
 */
import { randomUUID } from 'crypto';

import { AI_STAFF_ENABLED, AI_WIDGETS, ALL_AI_FLAGS } from '@/lib/ai/flags';
import type { AIClient, AIClientRequest, AIClientResponse } from '@/lib/ai/types';
import { AIAgentError } from '@/lib/ai/types';
import { suggestWidget } from '@/lib/ai/widget-suggest';
import {
    WIDGET_TYPES,
    WIDGET_TYPE_NAMES,
    validateWidgetConfig,
} from '@/lib/ai/widgets';
import { createPostSchema } from '@/schemas/postSchema';

// ─── Fixtures ────────────────────────────────────────────────────────────────

const VALID_POLL = {
    question: '¿Qué tema prefieren para el próximo taller?',
    options: ['Fotografía', 'Cocina cubana', 'Ajedrez'],
    closesAt: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
};

const VALID_COUNTDOWN = {
    title: 'Fiesta de aniversario del club',
    targetAt: new Date(Date.now() + 3 * 24 * 3600 * 1000).toISOString(),
    description: 'Celebramos un año juntos',
};

const VALID_LEADERBOARD = { title: 'Top miembros', limit: 5 };

const VALID_FAQ = {
    title: 'Preguntas frecuentes',
    items: [
        { q: '¿Cómo me uno?', a: 'Toca el botón "Unirme" en la página del club.' },
        { q: '¿Tiene costo?', a: 'No, la membresía básica es gratuita.' },
    ],
};

const VALID_RSVP = {
    eventId: randomUUID(),
    title: 'Noche de dominó',
    startsAt: new Date(Date.now() + 2 * 24 * 3600 * 1000).toISOString(),
    timezone: 'America/Havana',
    location: 'Casa de la cultura',
};

// ─── Registry ────────────────────────────────────────────────────────────────

describe('WIDGET_TYPES registry', () => {
    it('registers exactly the 5 v1 widget types', () => {
        expect([...WIDGET_TYPE_NAMES].sort()).toEqual(
            ['countdown', 'faq', 'leaderboard', 'poll', 'rsvp'].sort(),
        );
    });

    it('every type has a zod config schema, a renderer name and a description', () => {
        for (const name of WIDGET_TYPE_NAMES) {
            const entry = WIDGET_TYPES[name];
            expect(entry.configSchema).toBeDefined();
            expect(typeof entry.renderer).toBe('string');
            expect(entry.renderer.length).toBeGreaterThan(0);
            expect(typeof entry.description).toBe('string');
            expect(entry.description.length).toBeGreaterThan(0);
        }
    });
});

// ─── validateWidgetConfig ────────────────────────────────────────────────────

describe('validateWidgetConfig', () => {
    it('rejects an unknown widget type', () => {
        expect(() => validateWidgetConfig('giveaway' as never, {})).toThrow(
            /unknown widget type/i,
        );
    });

    it.each([
        ['poll', VALID_POLL],
        ['countdown', VALID_COUNTDOWN],
        ['leaderboard', VALID_LEADERBOARD],
        ['faq', VALID_FAQ],
        ['rsvp', VALID_RSVP],
    ] as const)('accepts a valid %s config', (type, config) => {
        expect(() => validateWidgetConfig(type, config)).not.toThrow();
    });

    it('returns the parsed config', () => {
        const parsed = validateWidgetConfig('leaderboard', { limit: 5 });
        expect(parsed).toMatchObject({ limit: 5 });
    });

    it('rejects a poll with fewer than 2 options', () => {
        expect(() =>
            validateWidgetConfig('poll', {
                question: '¿Pregunta?',
                options: ['Solo una'],
            }),
        ).toThrow();
    });

    it('rejects a poll with an empty question', () => {
        expect(() =>
            validateWidgetConfig('poll', { question: '  ', options: ['a', 'b'] }),
        ).toThrow();
    });

    it('rejects a countdown with an invalid targetAt', () => {
        expect(() =>
            validateWidgetConfig('countdown', { title: 'X', targetAt: 'mañana' }),
        ).toThrow();
    });

    it('rejects a leaderboard with limit 0', () => {
        expect(() => validateWidgetConfig('leaderboard', { limit: 0 })).toThrow();
    });

    it('rejects a faq with no items', () => {
        expect(() => validateWidgetConfig('faq', { items: [] })).toThrow();
    });

    it('rejects an rsvp with a non-uuid eventId', () => {
        expect(() =>
            validateWidgetConfig('rsvp', {
                eventId: 'no-es-un-uuid',
                title: 'Evento',
                startsAt: new Date().toISOString(),
            }),
        ).toThrow();
    });

    it('rejects an rsvp missing the title', () => {
        expect(() =>
            validateWidgetConfig('rsvp', {
                eventId: randomUUID(),
                startsAt: new Date().toISOString(),
            }),
        ).toThrow();
    });

    it('rejects configs with the wrong primitive types', () => {
        expect(() =>
            validateWidgetConfig('poll', { question: 42, options: ['a', 'b'] }),
        ).toThrow();
    });
});

// ─── postSchema allows widget posts ──────────────────────────────────────────

describe('postSchema widget support', () => {
    it('createPostSchema accepts a widget post with typed content', () => {
        const parsed = createPostSchema.parse({
            club_id: randomUUID(),
            content: { widget: 'poll', config: VALID_POLL },
            type: 'widget',
        });
        expect(parsed.type).toBe('widget');
    });

    it('still rejects an unknown post type', () => {
        expect(() =>
            createPostSchema.parse({
                club_id: randomUUID(),
                content: {},
                type: 'giveaway',
            }),
        ).toThrow();
    });
});

// ─── suggestWidget ───────────────────────────────────────────────────────────

/** Stub AI client: returns a fixed, schema-valid suggestion payload. */
function stubClient(payload: unknown): AIClient {
    const response: AIClientResponse = {
        content: JSON.stringify(payload),
        usage: { promptTokens: 0, completionTokens: 0 },
    };
    return {
        mock: true,
        async chat(_req: AIClientRequest): Promise<AIClientResponse> {
            return response;
        },
    };
}

const NO_DB_COST = {
    db: {
        async getBudget() {
            return null;
        },
        async createBudget() {},
        async updateBudget() {},
        async insertUsage() {},
        async listUsage() {
            return [];
        },
    },
    defaultCapUsd: 5,
};

function enableWidgetFlags() {
    process.env[AI_STAFF_ENABLED] = '1';
    process.env[AI_WIDGETS] = '1';
}

let savedEnv: NodeJS.ProcessEnv;
beforeEach(() => {
    savedEnv = { ...process.env };
    for (const flag of ALL_AI_FLAGS) delete process.env[flag];
    delete process.env.AISA_API_KEY;
});
afterEach(() => {
    process.env = savedEnv;
});

describe('suggestWidget', () => {
    it('returns a suggestion whose config validates against the registry', async () => {
        enableWidgetFlags();
        const suggestion = await suggestWidget(
            randomUUID(),
            'los miembros quieren votar el próximo taller',
            { client: stubClient({ type: 'poll', config: VALID_POLL, reason: 'El club pidió votar un tema' }), cost: NO_DB_COST },
        );
        expect(suggestion.type).toBe('poll');
        expect(suggestion.reason.length).toBeGreaterThan(0);
        // The returned config must pass the same zod validation as stored widgets.
        expect(() => validateWidgetConfig(suggestion.type, suggestion.config)).not.toThrow();
    });

    it('throws AI_OUTPUT_INVALID when the model drafts an invalid config', async () => {
        enableWidgetFlags();
        const bad = { type: 'poll', config: { question: 'x', options: ['solo-una'] }, reason: 'r' };
        await expect(
            suggestWidget(randomUUID(), 'contexto', {
                client: stubClient(bad),
                cost: NO_DB_COST,
            }),
        ).rejects.toThrow(AIAgentError);
    });

    it('throws AI_FLAG_DISABLED when the widgets agent flag is off', async () => {
        await expect(
            suggestWidget(randomUUID(), 'contexto', {
                client: stubClient({ type: 'poll', config: VALID_POLL, reason: 'r' }),
                cost: NO_DB_COST,
            }),
        ).rejects.toThrow(/disabled/i);
    });
});
