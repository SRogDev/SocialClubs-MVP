/**
 * Unit tests for lib/ai/moderation.ts (master plan Phases 29-33).
 *
 * Layered moderation: L1 deterministic checks (always on, cheap) ->
 * L2 AI classifier (only for "suspicious", only when AI_MODERATION is on) ->
 * risk-mapped action. AI NEVER auto-hides content: violations become a
 * pending `hide_proposed` moderation event for the AI Inbox.
 */
import {
    AI_MODERATION,
    AI_STAFF_ENABLED,
    ALL_AI_FLAGS,
} from '@/lib/ai/flags';
import {
    DEFAULT_MODERATION_POLICY,
    classifyContent,
    extractPostText,
    moderateComment,
    moderatePost,
    type ModerationDeps,
} from '@/lib/ai/moderation';
import type { AIClient, AISignal } from '@/lib/ai/types';
import type { CostDb } from '@/lib/ai/cost';

function emptyCostDb(): CostDb {
    return {
        async getBudget() {
            return null;
        },
        async createBudget() {},
        async updateBudget() {},
        async insertUsage() {},
        async listUsage() {
            return [];
        },
    };
}

/** Stub AI client with full control over the JSON returned. */
function stubClient(content: string): AIClient & { calls: number; signals: AISignal[] } {
    const stub = {
        mock: true,
        calls: 0,
        signals: [] as AISignal[],
        async chat(req: { messages: { content: string }[] }) {
            stub.calls += 1;
            stub.signals.push(JSON.parse(req.messages[1].content) as AISignal);
            return { content, usage: { promptTokens: 10, completionTokens: 20 } };
        },
    };
    return stub;
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

function enabledModerationDeps(client: AIClient): ModerationDeps {
    process.env[AI_STAFF_ENABLED] = '1';
    process.env[AI_MODERATION] = '1';
    return {
        invoke: { client, cost: { db: emptyCostDb(), defaultCapUsd: 5 } },
        store: { async insertEvent() {} },
    };
}

describe('deterministic layer (L1)', () => {
    test('blocklist hit -> violation, deterministic, no AI call', async () => {
        const client = stubClient('{}');
        const result = await classifyContent('Buy followers CHEAP, click now', {
            policy: { blocklist: ['buy followers'] },
            deps: enabledModerationDeps(client),
        });
        expect(result.verdict).toBe('violation');
        expect(result.layer).toBe('deterministic');
        expect(result.reasons).toContain('blocklist');
        // Deterministic violation is certain enough — the AI layer is skipped.
        expect(client.calls).toBe(0);
    });

    test('default blocklist is non-empty and configurable', async () => {
        expect(DEFAULT_MODERATION_POLICY.blocklist.length).toBeGreaterThan(0);
        const result = await classifyContent('hello');
        expect(result.verdict).toBe('clean');
        expect(result.reasons).toEqual([]);
    });

    test('link spam (>3 URLs) -> suspicious', async () => {
        const client = stubClient('{}');
        const text =
            'check https://a.example https://b.example https://c.example https://d.example';
        const result = await classifyContent(text, {
            deps: enabledModerationDeps(client),
        });
        expect(result.verdict).toBe('suspicious');
        expect(result.layer).toBe('deterministic');
        expect(result.reasons.some((r) => r.startsWith('link-spam'))).toBe(true);
        // Suspicious + flag ON -> AI layer consulted.
        expect(client.calls).toBe(1);
    });

    test('all-caps rant -> suspicious', async () => {
        const client = stubClient(
            JSON.stringify({ verdict: 'clean', categories: [], confidence: 0.9 }),
        );
        const result = await classifyContent(
            'THIS CLUB IS A COMPLETE SCAM AND EVERYONE KNOWS IT',
            { deps: enabledModerationDeps(client) },
        );
        expect(result.verdict).toBe('clean'); // AI overrode the suspicious L1 verdict
        expect(result.layer).toBe('ai');
        expect(result.reasons.some((r) => r.startsWith('all-caps'))).toBe(true);
        expect(client.calls).toBe(1);
    });

    test('clean text -> clean, deterministic, no AI call', async () => {
        const client = stubClient('{}');
        const result = await classifyContent(
            'Hey everyone, really excited about the meetup this Saturday!',
            { deps: enabledModerationDeps(client) },
        );
        expect(result.verdict).toBe('clean');
        expect(result.layer).toBe('deterministic');
        expect(result.reasons).toEqual([]);
        expect(client.calls).toBe(0);
    });

    test('suspicious with AI flag OFF stays suspicious, AI not called', async () => {
        const client = stubClient('{}');
        const text = 'https://a.example https://b.example https://c.example https://d.example';
        const result = await classifyContent(text, {
            deps: { invoke: { client, cost: { db: emptyCostDb(), defaultCapUsd: 5 } } },
        });
        expect(result.verdict).toBe('suspicious');
        expect(result.layer).toBe('deterministic');
        expect(client.calls).toBe(0);
    });

    test('classifier failure -> fail-open to human review (suspicious), never throws', async () => {
        const failing: AIClient = {
            mock: true,
            async chat() {
                throw new Error('provider down');
            },
        };
        const result = await classifyContent(
            'https://a.example https://b.example https://c.example https://d.example',
            { deps: enabledModerationDeps(failing) },
        );
        expect(result.verdict).toBe('suspicious');
        expect(result.reasons).toContain('ai-classifier-failed');
    });
});

describe('moderatePost / moderateComment', () => {
    test('violation -> hide_proposed event stored, never executed at L1', async () => {
        const stored: { action_taken: string; target_type: string }[] = [];
        const deps: ModerationDeps = {
            store: {
                async insertEvent(row) {
                    stored.push({ action_taken: row.action_taken, target_type: row.target_type });
                },
            },
        };
        const outcome = await moderatePost(
            {
                clubId: 'club-1',
                postId: 'post-1',
                text: 'buy followers cheap, click now',
                policy: { blocklist: ['buy followers'] },
            },
            deps,
        );
        expect(outcome.verdict).toBe('violation');
        expect(outcome.actionTaken).toBe('hide_proposed');
        // Exactly one pending draft — nothing was executed (there is no
        // hide function; the event row IS the draft for the AI Inbox).
        expect(stored).toHaveLength(1);
        expect(stored[0]).toEqual({ action_taken: 'hide_proposed', target_type: 'post' });
    });

    test('clean post -> none action stored', async () => {
        const stored: { action_taken: string }[] = [];
        const outcome = await moderatePost(
            { clubId: 'club-1', postId: 'post-2', text: 'Great session today!' },
            { store: { async insertEvent(row) { stored.push({ action_taken: row.action_taken }); } } },
        );
        expect(outcome.verdict).toBe('clean');
        expect(outcome.actionTaken).toBe('none');
        expect(stored).toHaveLength(1);
    });

    test('suspicious comment -> flagged_for_review', async () => {
        const stored: { action_taken: string; target_type: string }[] = [];
        const outcome = await moderateComment(
            {
                clubId: 'club-1',
                commentId: 'comment-1',
                text: 'https://a.example https://b.example https://c.example https://d.example',
            },
            {
                store: {
                    async insertEvent(row) {
                        stored.push({ action_taken: row.action_taken, target_type: row.target_type });
                    },
                },
            },
        );
        expect(outcome.verdict).toBe('suspicious');
        expect(outcome.actionTaken).toBe('flagged_for_review');
        expect(stored[0].target_type).toBe('comment');
    });

    test('storage failure never throws', async () => {
        const outcome = await moderatePost(
            { clubId: 'club-1', postId: 'post-3', text: 'Hello world' },
            {
                store: {
                    async insertEvent() {
                        throw new Error('db down');
                    },
                },
            },
        );
        expect(outcome.verdict).toBe('clean');
    });
});

describe('extractPostText', () => {
    test('pulls text from common content fields', () => {
        expect(
            extractPostText({ text: 'hello', caption: 'world', other: 123 }),
        ).toBe('hello\nworld');
    });

    test('returns empty string for null content', () => {
        expect(extractPostText(null)).toBe('');
    });

    test('joins string leaves when no known field matches', () => {
        expect(extractPostText({ nested: { note: 'deep text' } })).toContain('deep text');
    });
});
