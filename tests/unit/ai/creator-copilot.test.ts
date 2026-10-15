/**
 * Tests for lib/ai/creator-copilot.ts (master plan Phases 34-37, 39-40).
 *
 * The Creator Copilot is a DRAFTS-ONLY agent: every function returns content
 * for the creator to review and publish manually. Nothing here may publish.
 */
import {
    draftPost,
    extractTagCandidates,
    improvePost,
    suggestTags,
    type CreatorCopilotDeps,
} from '@/lib/ai/creator-copilot';
import { AI_CREATOR_COPILOT, AI_STAFF_ENABLED, ALL_AI_FLAGS } from '@/lib/ai/flags';
import { MockAIClient } from '@/lib/ai/mock-client';
import type { AIClient, AIClientRequest, AIAgentError, ChatMessage } from '@/lib/ai/types';

/** Capturing client: records the user message so tests can assert on prompt context. */
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

function userPayload(client: { userMessages: ChatMessage[] }): Record<string, unknown> {
    const raw = client.userMessages[0]?.content ?? '{}';
    return (JSON.parse(raw) as { payload: Record<string, unknown> }).payload;
}

function enabledDeps(client: AIClient): CreatorCopilotDeps {
    process.env[AI_STAFF_ENABLED] = '1';
    process.env[AI_CREATOR_COPILOT] = '1';
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
        clubContext: {
            async load(clubId: string) {
                return {
                    name: 'Club de Prueba',
                    clubId,
                    recentTopics: ['torneo de dominó', 'clase de salsa'],
                };
            },
        },
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

describe('extractTagCandidates', () => {
    test('pulls hashtags and frequent keywords deterministically', () => {
        const candidates = extractTagCandidates(
            'Gran noche de salsa en el club. Bailamos salsa, merengue y bachata con música en vivo.',
        );
        expect(candidates).toContain('salsa');
        expect(candidates).toContain('merengue');
        // Deterministic: same input, same output.
        expect(extractTagCandidates('Gran noche de salsa. Bailamos salsa.')).toEqual(
            extractTagCandidates('Gran noche de salsa. Bailamos salsa.'),
        );
    });

    test('returns an empty list for blank content', () => {
        expect(extractTagCandidates('')).toEqual([]);
        expect(extractTagCandidates('   ')).toEqual([]);
    });
});

describe('draftPost', () => {
    test('returns a draft (title + body + tags) grounded in club context', async () => {
        const client = capturingClient();
        const result = await draftPost('torneo de ajedrez', 'club-1', 'friendly', enabledDeps(client));

        expect(result.output.title).toBe('mock:title');
        expect(result.output.body).toBe('mock:body');
        expect(Array.isArray(result.output.tags)).toBe(true);
        expect(result.trace.mock).toBe(true);

        const payload = userPayload(client);
        expect(payload['task']).toBe('draft-post');
        expect(payload['topic']).toBe('torneo de ajedrez');
        expect(String(payload['clubName'])).toBe('Club de Prueba');
        expect(payload['recentTopics']).toEqual(['torneo de dominó', 'clase de salsa']);
    });

    test('never publishes: the draft is returned to the creator only', async () => {
        const client = capturingClient();
        const result = await draftPost('tema libre', 'club-1', undefined, enabledDeps(client));

        // A draft has no post id and no publish side-effect: the only
        // injected deps are an AI client + cost + context store. If the
        // implementation ever gained a publish path it would need a new dep.
        expect(result.output).not.toHaveProperty('postId');
        expect(result.output).not.toHaveProperty('publishedAt');
    });

    test('falls back to a generic tone when the tone is unknown', async () => {
        const client = capturingClient();
        await draftPost('tema', 'club-1', 'misterioso' as never, enabledDeps(client));
        expect(userPayload(client)['tone']).toBe('friendly');
    });

    test('degrades gracefully when club context fails to load', async () => {
        const client = capturingClient();
        const deps = enabledDeps(client);
        deps.clubContext = {
            async load() {
                throw new Error('db down');
            },
        };
        const result = await draftPost('tema', 'club-1', 'fun', deps);
        expect(result.output.title).toBe('mock:title');
        expect(userPayload(client)['clubName']).toBe('');
    });

    test('budget exceeded throws AI_BUDGET_EXCEEDED before the model is called', async () => {
        const client = capturingClient();
        const deps = enabledDeps(client);
        deps.cost = {
            db: {
                async getBudget() {
                    return {
                        club_id: 'club-1',
                        monthly_cap_usd: 5,
                        spent_usd: 5,
                        period_start: '2026-10-01',
                        disabled: false,
                        updated_at: '2026-10-15T00:00:00.000Z',
                    };
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

        let code: string | undefined;
        try {
            await draftPost('tema', 'club-1', 'friendly', deps);
        } catch (err) {
            code = (err as AIAgentError).code;
        }
        expect(code).toBe('AI_BUDGET_EXCEEDED');
        // The model must never be invoked when the budget is exhausted.
        expect(client.userMessages).toHaveLength(0);
    });
});

describe('suggestTags', () => {
    test('sends the deterministic candidates to the refinement pass', async () => {
        const client = capturingClient();
        const content = 'Gran noche de salsa y merengue en el club.';
        const result = await suggestTags(content, 'club-1', enabledDeps(client));

        expect(Array.isArray(result.output.tags)).toBe(true);
        const payload = userPayload(client);
        expect(payload['task']).toBe('suggest-tags');
        expect(payload['content']).toBe(content);
        const candidates = payload['candidates'] as string[];
        expect(candidates).toContain('salsa');
        expect(candidates).toContain('merengue');
    });
});

describe('improvePost', () => {
    test('returns an improved version plus the list of changes', async () => {
        const client = capturingClient();
        const original = 'hola a todos vamos a jugar';
        const result = await improvePost(original, 'club-1', enabledDeps(client));

        expect(result.output.improved).toBe('mock:improved');
        expect(Array.isArray(result.output.changes)).toBe(true);
        const payload = userPayload(client);
        expect(payload['task']).toBe('improve-post');
        expect(payload['content']).toBe(original);
    });

    test('rejects empty content without calling the model', async () => {
        const client = capturingClient();
        await expect(improvePost('   ', 'club-1', enabledDeps(client))).rejects.toThrow(
            /content/i,
        );
        expect(client.userMessages).toHaveLength(0);
    });
});
