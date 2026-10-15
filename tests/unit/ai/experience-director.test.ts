/**
 * Experience Director agent (master plan Phases 46-52) — unit tests
 * (RED → GREEN).
 *
 * - suggestEvent returns a DRAFT concept grounded in club context
 *   (club name + recent topics reach the prompt).
 * - draftEventAnnouncement invokes the agent with the `event_created`
 *   signal type.
 * - handleEventCreated saves a pending_approval draft (never auto-sends)
 *   with an idempotency key; failures are swallowed by the Safe variant.
 */
import {
    AI_EXPERIENCE_DIRECTOR,
    AI_STAFF_ENABLED,
    ALL_AI_FLAGS,
} from '@/lib/ai/flags';
import { MockAIClient } from '@/lib/ai/mock-client';
import {
    draftEventAnnouncement,
    handleEventCreated,
    handleEventCreatedSafe,
    suggestEvent,
    summarizeClubForPrompt,
    type ExperienceDirectorDeps,
} from '@/lib/ai/agents/experience-director';
import { AIAgentError, type AIClient, type AIClientRequest, type ChatMessage } from '@/lib/ai/types';

function capturingClient(): AIClient & { userMessages: ChatMessage[] } {
    const mock = new MockAIClient();
    const seen: ChatMessage[] = [];
    return {
        mock: true,
        userMessages: seen,
        async chat(req: AIClientRequest) {
            seen.push(...req.messages.filter((m) => m.role === 'user'));
            return mock.chat(req);
        },
    };
}

function signalPayload(client: { userMessages: ChatMessage[] }): {
    signal?: unknown;
    payload: Record<string, unknown>;
} {
    const raw = client.userMessages[0]?.content ?? '{}';
    return JSON.parse(raw) as { signal?: unknown; payload: Record<string, unknown> };
}

function enabledDeps(
    client: AIClient,
    overrides: Partial<ExperienceDirectorDeps> = {},
): ExperienceDirectorDeps {
    process.env[AI_STAFF_ENABLED] = '1';
    process.env[AI_EXPERIENCE_DIRECTOR] = '1';
    return {
        client,
        cost: {
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
        },
        loadClubContext: async () => ({
            name: 'Club Salsa Habana',
            recentTopics: ['salsa cubana', 'rueda de casino'],
        }),
        loadEvent: async (eventId: string) => ({
            id: eventId,
            club_id: 'club-1',
            title: 'Taller de salsa',
            description: 'Aprende los pasos básicos',
            starts_at: '2026-10-20T18:00:00.000Z',
            ends_at: '2026-10-20T20:00:00.000Z',
            timezone: 'America/Havana',
            capacity: 30,
        }),
        saveDraft: async () => ({ id: 'draft-1' }),
        ...overrides,
    };
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

describe('summarizeClubForPrompt', () => {
    test('renders club name and recent topics for grounding', () => {
        const text = summarizeClubForPrompt({
            name: 'Club Salsa Habana',
            recentTopics: ['salsa cubana', 'rueda de casino'],
        });
        expect(text).toMatch(/Club Salsa Habana/);
        expect(text).toMatch(/salsa cubana/);
    });

    test('is honest when there is no context', () => {
        expect(summarizeClubForPrompt({ name: '', recentTopics: [] })).toMatch(/No club context/);
    });
});

describe('suggestEvent', () => {
    test('returns a DRAFT concept grounded in the club context', async () => {
        const client = capturingClient();
        const result = await suggestEvent('club-1', 'baile', enabledDeps(client));
        expect(result.output.status).toBe('draft');
        expect(result.output.title.length).toBeGreaterThan(0);
        expect(result.output.format.length).toBeGreaterThan(0);
        expect(result.output.idealTiming.length).toBeGreaterThan(0);
        const payload = signalPayload(client);
        const prompt = JSON.stringify(payload);
        expect(prompt).toMatch(/Club Salsa Habana/);
        expect(prompt).toMatch(/baile/);
    });

    test('is disabled when the feature flag is off', async () => {
        const client = capturingClient();
        const deps = enabledDeps(client);
        delete process.env[AI_EXPERIENCE_DIRECTOR];
        await expect(suggestEvent('club-1', undefined, deps)).rejects.toMatchObject({
            code: 'AI_FLAG_DISABLED',
        });
    });
});

describe('draftEventAnnouncement', () => {
    test('invokes the agent with the event_created signal and event details', async () => {
        const client = capturingClient();
        const result = await draftEventAnnouncement('event-1', enabledDeps(client));
        expect(result.output.title.length).toBeGreaterThan(0);
        expect(result.output.body.length).toBeGreaterThan(0);
        const message = signalPayload(client);
        expect(message.payload.eventId).toBe('event-1');
        expect(message.signal).toBe('event_created');
        const prompt = JSON.stringify(message);
        expect(prompt).toMatch(/Taller de salsa/);
    });

    test('throws when the event does not exist', async () => {
        const client = capturingClient();
        const deps = enabledDeps(client, { loadEvent: async () => null });
        await expect(draftEventAnnouncement('missing', deps)).rejects.toThrow(/not found/i);
    });
});

describe('handleEventCreated', () => {
    test('saves a pending_approval draft (never auto-sends) with idempotency key', async () => {
        const client = capturingClient();
        const saved: unknown[] = [];
        const deps = enabledDeps(client, {
            saveDraft: async (draft) => {
                saved.push(draft);
                return { id: 'draft-1' };
            },
        });
        const result = await handleEventCreated('event-1', deps);
        expect(result.draftId).toBe('draft-1');
        const draft = saved[0] as Record<string, unknown>;
        expect(draft.status).toBe('pending_approval');
        expect(draft.agentId).toBe('experience-director');
        expect(draft.idempotencyKey).toBe('event_created:event-1');
        expect(draft.title).toBeTruthy();
    });

    test('Safe variant swallows failures (fire-and-forget from the service)', async () => {
        const client = capturingClient();
        const deps = enabledDeps(client, {
            saveDraft: async () => {
                throw new Error('db down');
            },
        });
        await expect(handleEventCreatedSafe('event-1', deps)).resolves.toBeUndefined();
    });

    test('flag disabled → typed AI_FLAG_DISABLED error (surfaced, not swallowed)', async () => {
        const client = capturingClient();
        const deps = enabledDeps(client);
        delete process.env[AI_EXPERIENCE_DIRECTOR];
        await expect(handleEventCreated('event-1', deps)).rejects.toBeInstanceOf(AIAgentError);
    });
});
