/**
 * Tests for lib/ai/community-manager.ts — draftOnboarding and
 * draftSignalResponse include the member profile summary (interests) in the
 * draft context.
 */
import { MockAIClient } from '@/lib/ai/mock-client';
import {
    draftOnboarding,
    draftSignalResponse,
    summarizeProfileForPrompt,
    type CommunityManagerDeps,
} from '@/lib/ai/community-manager';
import { AI_COMMUNITY_MANAGER, AI_STAFF_ENABLED, ALL_AI_FLAGS } from '@/lib/ai/flags';
import type { MemberSignal, SignalDb } from '@/lib/ai/relationship';
import type { AIClient, AIClientRequest, ChatMessage } from '@/lib/ai/types';

function signal(overrides: Partial<MemberSignal> = {}): MemberSignal {
    return {
        id: 'sig-1',
        club_id: 'club-1',
        user_id: 'user-1',
        signal_type: 'posted',
        payload: {},
        created_at: '2026-10-10T12:00:00.000Z',
        ...overrides,
    };
}

function stubSignalDb(rows: MemberSignal[]): SignalDb {
    return {
        async insertSignal() {
            throw new Error('not needed');
        },
        async listSignals(clubId: string, userId: string) {
            return rows.filter((r) => r.club_id === clubId && r.user_id === userId);
        },
    };
}

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
    return JSON.parse(raw) as { payload: Record<string, unknown> };
}

function enabledDeps(client: AIClient, rows: MemberSignal[]): CommunityManagerDeps {
    process.env[AI_STAFF_ENABLED] = '1';
    process.env[AI_COMMUNITY_MANAGER] = '1';
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
            },
            defaultCapUsd: 5,
        },
        relationship: { db: stubSignalDb(rows) },
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

describe('summarizeProfileForPrompt', () => {
    test('renders interests first when signals exist', () => {
        const text = summarizeProfileForPrompt({
            clubId: 'club-1',
            userId: 'user-1',
            interests: [
                { tag: 'chess', count: 3 },
                { tag: 'salsa', count: 1 },
            ],
            engagementTrend: 'up',
            milestones: [{ label: 'First post', at: '2026-10-01T00:00:00.000Z' }],
            lastActive: '2026-10-14T00:00:00.000Z',
            signalCount: 4,
        });
        expect(text).toMatch(/Interests: chess \(3\), salsa \(1\)/);
        expect(text).toMatch(/Engagement trend: up/);
        expect(text).toMatch(/First post/);
    });

    test('falls back to the no-activity branch for null/empty profiles', () => {
        expect(summarizeProfileForPrompt(null)).toMatch(/No prior activity/);
        expect(
            summarizeProfileForPrompt({
                clubId: 'c',
                userId: 'u',
                interests: [],
                engagementTrend: 'flat',
                milestones: [],
                lastActive: null,
                signalCount: 0,
            }),
        ).toMatch(/No prior activity/);
    });
});

describe('draftOnboarding', () => {
    test('passes member interests into the draft context', async () => {
        const client = capturingClient();
        const rows = [
            signal({ payload: { tags: ['chess', 'salsa'] } }),
            signal({ payload: { tags: ['chess'] }, signal_type: 'engaged' }),
        ];
        const result = await draftOnboarding('club-1', 'user-1', enabledDeps(client, rows));

        expect(result.output.draft).toBe('mock:draft');
        const payload = userPayload(client).payload;
        expect(payload['task']).toBe('onboarding');
        expect(String(payload['memberProfileSummary'])).toMatch(/chess \(2\)/);
        expect(String(payload['memberProfileSummary'])).toMatch(/salsa \(1\)/);
    });

    test('degrades gracefully when the member has no signals', async () => {
        const client = capturingClient();
        const result = await draftOnboarding('club-1', 'user-9', enabledDeps(client, []));

        expect(result.output.draft).toBe('mock:draft');
        const payload = userPayload(client).payload;
        expect(String(payload['memberProfileSummary'])).toMatch(/No prior activity/);
    });
});

describe('draftSignalResponse', () => {
    test('includes both the signal summary and the member interests', async () => {
        const client = capturingClient();
        const rows = [signal({ payload: { tags: ['running'] } })];
        const result = await draftSignalResponse(
            'club-1',
            'user-1',
            'Member hit the "100 points" milestone.',
            enabledDeps(client, rows),
        );

        expect(result.output.draft).toBe('mock:draft');
        const payload = userPayload(client).payload;
        expect(payload['task']).toBe('signal-response');
        expect(payload['signalSummary']).toBe('Member hit the "100 points" milestone.');
        expect(String(payload['memberProfileSummary'])).toMatch(/running \(1\)/);
    });
});
