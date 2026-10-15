import { z } from 'zod';

import {
    AI_COMMUNITY_MANAGER,
    AI_REVIEWER,
    AI_STAFF_ENABLED,
    ALL_AI_FLAGS,
} from '@/lib/ai/flags';
import type { ClubAIConfigRow } from '@/lib/ai/policy';
import type { AgentDefinition, AIClient } from '@/lib/ai/types';
import {
    verifyAndExecute,
    type AIActionRow,
    type NewAIActionRow,
    type NewAIActionReviewRow,
    type VerifyDb,
} from '@/lib/ai/verify';

let savedEnv: NodeJS.ProcessEnv;

const AGENT: AgentDefinition = {
    id: 'community-manager',
    role: 'Community Manager',
    mission: 'Keep the club warm.',
    contextSources: [],
    tools: ['send_message', 'notify_creator'],
    permissions: ['send_message', 'notify_creator'],
    triggers: [],
    policies: [],
    outputSchema: z.object({ ok: z.boolean() }),
};

function config(level: 1 | 2 | 3): ClubAIConfigRow {
    return {
        clubId: 'club-1',
        proactivityLevel: level,
        enabledAgents: ['community-manager'],
        tone: 'friendly',
        policies: {},
        updatedAt: new Date(0).toISOString(),
    };
}

/** In-memory VerifyDb with real unique-key behavior. */
function memoryDb(level: 1 | 2 | 3 = 2): VerifyDb & {
    actions: AIActionRow[];
    reviews: NewAIActionReviewRow[];
    insertCalls: number;
} {
    const actions: AIActionRow[] = [];
    const reviews: NewAIActionReviewRow[] = [];
    const state = {
        actions,
        reviews,
        insertCalls: 0,
        async getClubAIConfig() {
            return config(level);
        },
        async findActionByIdempotencyKey(key: string) {
            return actions.find((a) => a.idempotencyKey === key) ?? null;
        },
        async insertAction(row: NewAIActionRow) {
            state.insertCalls += 1;
            if (actions.some((a) => a.idempotencyKey === row.idempotencyKey)) {
                const err = new Error('duplicate key value violates unique constraint');
                (err as Error & { code?: string }).code = '23505';
                throw err;
            }
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
        async insertReview(row: NewAIActionReviewRow) {
            reviews.push(row);
        },
    };
    return state;
}

function reviewerClient(
    decisions: Array<{
        decision: 'pass' | 'revise' | 'escalate' | 'block';
        feedback: string;
        revisedInputs?: Record<string, unknown>;
    }>,
): AIClient {
    let i = 0;
    return {
        mock: true,
        async chat() {
            const d = decisions[Math.min(i, decisions.length - 1)];
            i += 1;
            return {
                content: JSON.stringify(d),
                usage: { promptTokens: 0, completionTokens: 0 },
            };
        },
    };
}

const EMPTY_COST = {
    db: {
        async getBudget() {
            return null;
        },
        async createBudget() {},
        async updateBudget() {},
        async insertUsage() {},
    },
};

beforeEach(() => {
    savedEnv = { ...process.env };
    for (const flag of ALL_AI_FLAGS) delete process.env[flag];
    process.env[AI_STAFF_ENABLED] = '1';
    process.env[AI_COMMUNITY_MANAGER] = '1';
    process.env[AI_REVIEWER] = '1';
});

afterEach(() => {
    process.env = savedEnv;
});

describe('verification pipeline (ADR-002 §3)', () => {
    test('approve path: low-risk auto action executes and is audited', async () => {
        const db = memoryDb(2);
        const res = await verifyAndExecute({
            agentDef: AGENT,
            action: 'notify_creator',
            inputs: { creatorId: 'c1', title: 'Briefing', body: 'Weekly digest ready.' },
            ctx: { clubId: 'club-1', idempotencyKey: 'key-approve-1' },
            deps: {
                db,
                client: reviewerClient([{ decision: 'pass', feedback: 'fine' }]),
                cost: EMPTY_COST,
            },
        });
        expect(res.status).toBe('executed');
        expect(res.actionId).toBeDefined();
        expect(db.actions).toHaveLength(1);
        expect(db.actions[0].status).toBe('executed');
        expect(db.actions[0].policyResult).toMatchObject({ allowed: true, mode: 'auto' });
    });

    test('revise -> escalate path: reviewer escalates to a pending approval', async () => {
        const db = memoryDb(3);
        const res = await verifyAndExecute({
            agentDef: AGENT,
            action: 'send_message',
            inputs: { recipientId: 'u1', body: 'Hello!' },
            ctx: { clubId: 'club-1', idempotencyKey: 'key-revise-1' },
            deps: {
                db,
                client: reviewerClient([
                    {
                        decision: 'revise',
                        feedback: 'tone down',
                        revisedInputs: { body: 'Hello there.' },
                    },
                    { decision: 'escalate', feedback: 'still unsure' },
                ]),
                cost: EMPTY_COST,
            },
        });
        expect(res.status).toBe('pending_approval');
        expect(res.actionId).toBeDefined();
        // Two AI reviews recorded; nothing executed.
        expect(db.reviews).toHaveLength(2);
        expect(db.reviews.map((r) => r.decision)).toEqual(['revise', 'escalate']);
        const row = db.actions.find((a) => a.id === res.actionId);
        expect(row?.status).toBe('pending_approval');
    });

    test('reviewer block stops execution', async () => {
        const db = memoryDb(3);
        const res = await verifyAndExecute({
            agentDef: AGENT,
            action: 'send_message',
            inputs: { recipientId: 'u1', body: 'spam?' },
            ctx: { clubId: 'club-1', idempotencyKey: 'key-block-1' },
            deps: {
                db,
                client: reviewerClient([{ decision: 'block', feedback: 'spam' }]),
                cost: EMPTY_COST,
            },
        });
        expect(res.status).toBe('blocked');
        expect(db.actions[0].status).toBe('blocked');
    });

    test('idempotency: same key twice executes once and returns the original result', async () => {
        const db = memoryDb(2);
        const opts = {
            agentDef: AGENT,
            action: 'notify_creator',
            inputs: { creatorId: 'c1', title: 'Briefing', body: 'Weekly digest ready.' },
            ctx: { clubId: 'club-1', idempotencyKey: 'key-idem-1' },
            deps: {
                db,
                client: reviewerClient([{ decision: 'pass', feedback: 'fine' }]),
                cost: EMPTY_COST,
            },
        };
        const first = await verifyAndExecute(opts);
        const second = await verifyAndExecute(opts);
        expect(first.status).toBe('executed');
        expect(second.status).toBe('executed');
        expect(second.actionId).toBe(first.actionId);
        expect(db.insertCalls).toBe(1);
        expect(db.actions).toHaveLength(1);
    });

    test('draft mode (L1): action is stored as a draft, never executed', async () => {
        const db = memoryDb(1);
        const res = await verifyAndExecute({
            agentDef: AGENT,
            action: 'notify_creator',
            inputs: { creatorId: 'c1', title: 'Briefing', body: 'Weekly digest ready.' },
            ctx: { clubId: 'club-1', idempotencyKey: 'key-draft-1' },
            deps: {
                db,
                client: reviewerClient([{ decision: 'pass', feedback: 'fine' }]),
                cost: EMPTY_COST,
            },
        });
        expect(res.status).toBe('draft');
        expect(db.actions[0].status).toBe('draft');
        // Reviewer is skipped in draft mode (the human sees the draft).
        expect(db.reviews).toHaveLength(0);
    });

    test('unknown action is rejected', async () => {
        const db = memoryDb(2);
        const res = await verifyAndExecute({
            agentDef: AGENT,
            action: 'delete_club',
            inputs: {},
            ctx: { clubId: 'club-1', idempotencyKey: 'key-unknown-1' },
            deps: { db, cost: EMPTY_COST },
        });
        expect(res.status).toBe('rejected');
        expect(res.reason).toMatch(/unknown/i);
    });

    test('schema-invalid inputs fail without executing', async () => {
        const db = memoryDb(2);
        const res = await verifyAndExecute({
            agentDef: AGENT,
            action: 'send_message',
            inputs: { nope: true },
            ctx: { clubId: 'club-1', idempotencyKey: 'key-schema-1' },
            deps: { db, cost: EMPTY_COST },
        });
        expect(res.status).toBe('failed');
        expect(db.actions[0].status).toBe('failed');
    });

    test('agent missing the required permission is blocked', async () => {
        const db = memoryDb(2);
        const res = await verifyAndExecute({
            agentDef: { ...AGENT, permissions: ['notify_creator'] },
            action: 'send_message',
            inputs: { recipientId: 'u1', body: 'Hello!' },
            ctx: { clubId: 'club-1', idempotencyKey: 'key-perm-1' },
            deps: { db, cost: EMPTY_COST },
        });
        expect(res.status).toBe('blocked');
        expect(res.reason).toMatch(/permission/i);
    });
});
