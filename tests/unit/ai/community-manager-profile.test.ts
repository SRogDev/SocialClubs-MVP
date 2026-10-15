/**
 * Relationship-intelligence wiring for the Community Manager (Phases 25-28):
 * draftOnboarding and draftSignalResponse include the member's club-scoped
 * profile summary (interests first) in the prompt context.
 *
 * Tests the real module (lib/ai/agents/community-manager.ts) with an
 * in-memory VerifyDb, a capturing model client, and a stubbed signal store.
 */
import { MockAIClient } from '@/lib/ai/mock-client';
import { AI_COMMUNITY_MANAGER, AI_STAFF_ENABLED } from '@/lib/ai/flags';
import type { CostDb } from '@/lib/ai/cost';
import type { ClubAIConfigRow } from '@/lib/ai/policy';
import type { AIClient, AIClientRequest, ChatMessage } from '@/lib/ai/types';
import {
    draftOnboarding,
    draftSignalResponse,
    type CommunityManagerDeps,
} from '@/lib/ai/agents/community-manager';
import type { MemberSignal, SignalDb } from '@/lib/ai/relationship';
import type {
    AIActionRow,
    NewAIActionRow,
    NewAIActionReviewRow,
    VerifyDb,
} from '@/lib/ai/verify';

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

function config(): ClubAIConfigRow {
    return {
        clubId: 'club-1',
        proactivityLevel: 1,
        enabledAgents: ['community-manager'],
        tone: 'friendly',
        policies: {},
        updatedAt: new Date(0).toISOString(),
    };
}

/** In-memory VerifyDb: L1 stores drafts, never executes. */
function memoryDb(): VerifyDb {
    const actions: AIActionRow[] = [];
    return {
        async getClubAIConfig() {
            return config();
        },
        async findActionByIdempotencyKey(key: string) {
            return actions.find((a) => a.idempotencyKey === key) ?? null;
        },
        async insertAction(row: NewAIActionRow) {
            const full: AIActionRow = {
                ...row,
                id: `action-${actions.length + 1}`,
                createdAt: new Date(0).toISOString(),
            };
            actions.push(full);
            return full;
        },
        async updateAction(id: string, patch: Partial<NewAIActionRow>) {
            const row = actions.find((a) => a.id === id);
            if (row) Object.assign(row, patch);
        },
        async insertReview(_row: NewAIActionReviewRow) {},
    };
}

function emptyCostDb(): CostDb {
    return {
        async getBudget() {
            return null;
        },
        async createBudget() {},
        async updateBudget() {},
        async insertUsage() {},
    };
}

/** Capturing client: records user messages so tests can assert on prompt context. */
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

function payloadOf(client: { userMessages: ChatMessage[] }): Record<string, unknown> {
    const raw = client.userMessages[0]?.content ?? '{}';
    return (JSON.parse(raw) as { payload: Record<string, unknown> }).payload;
}

function depsFor(
    client: AIClient,
    rows: MemberSignal[],
): CommunityManagerDeps & { client: AIClient } {
    return {
        db: memoryDb(),
        client,
        cost: { db: emptyCostDb(), defaultCapUsd: 5 },
        relationship: { db: stubSignalDb(rows) },
    };
}

let savedEnv: NodeJS.ProcessEnv;
beforeEach(() => {
    savedEnv = { ...process.env };
    process.env[AI_STAFF_ENABLED] = '1';
    process.env[AI_COMMUNITY_MANAGER] = '1';
});
afterEach(() => {
    process.env = savedEnv;
});

describe('draftOnboarding profile wiring', () => {
    test('includes the member profile summary (interests) in the prompt', async () => {
        const client = capturingClient();
        const rows = [
            signal({ payload: { tags: ['chess', 'salsa'] } }),
            signal({ payload: { tags: ['chess'] }, signal_type: 'engaged' }),
        ];
        const result = await draftOnboarding(
            { userId: 'user-1', clubId: 'club-1', memberName: 'Ana' },
            depsFor(client, rows),
        );

        expect(result.status).toBe('draft');
        const payload = payloadOf(client);
        expect(String(payload['memberProfileSummary'])).toMatch(/chess \(2\)/);
        expect(String(payload['memberProfileSummary'])).toMatch(/salsa \(1\)/);
    });

    test('degrades to the no-activity branch when the member has no signals', async () => {
        const client = capturingClient();
        const result = await draftOnboarding(
            { userId: 'user-9', clubId: 'club-1' },
            depsFor(client, []),
        );

        expect(result.status).toBe('draft');
        expect(String(payloadOf(client)['memberProfileSummary'])).toMatch(
            /No prior activity/,
        );
    });

    test('a failing signal store never blocks the draft', async () => {
        const client = capturingClient();
        const failing: SignalDb = {
            async insertSignal() {
                throw new Error('not needed');
            },
            async listSignals() {
                throw new Error('DB down');
            },
        };
        const result = await draftOnboarding(
            { userId: 'user-1', clubId: 'club-1' },
            { db: memoryDb(), client, cost: { db: emptyCostDb() }, relationship: { db: failing } },
        );

        expect(result.status).toBe('draft');
        expect(String(payloadOf(client)['memberProfileSummary'])).toMatch(
            /No prior activity/,
        );
    });
});

describe('draftSignalResponse profile wiring', () => {
    test('new_post includes the author profile summary in the prompt', async () => {
        const client = capturingClient();
        const rows = [signal({ payload: { tags: ['running'] } })];
        const result = await draftSignalResponse(
            {
                type: 'new_post',
                clubId: 'club-1',
                payload: { postId: 'post-1', authorId: 'user-1', postExcerpt: 'Morning run!' },
            },
            depsFor(client, rows),
        );

        expect(result.status).toBe('draft');
        const payload = payloadOf(client);
        expect(String(payload['authorProfileSummary'])).toMatch(/running \(1\)/);
    });

    test('member_joined delegates to onboarding with the profile summary', async () => {
        const client = capturingClient();
        const rows = [signal({ payload: { tags: ['yoga'] } })];
        const result = await draftSignalResponse(
            {
                type: 'member_joined',
                clubId: 'club-1',
                payload: { userId: 'user-1', userName: 'Ana' },
            },
            depsFor(client, rows),
        );

        expect(result.status).toBe('draft');
        expect(String(payloadOf(client)['memberProfileSummary'])).toMatch(/yoga \(1\)/);
    });
});
