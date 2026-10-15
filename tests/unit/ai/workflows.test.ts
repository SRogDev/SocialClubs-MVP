/**
 * Community automation workflows (master plan Phases 41-45).
 *
 * The contract, enforced by the governance pipeline (verify.ts) per step:
 * - L1 (Advisor):    every step lands as a DRAFT in the AI Inbox — nothing
 *                    auto-sends, no exceptions.
 * - L2 (Operator):   low-risk steps auto-execute; medium steps go to the AI
 *                    reviewer and, on escalate, wait for human approval.
 * - L3 (Autonomous): low-risk steps auto-execute; medium steps pass the AI
 *                    reviewer and auto-execute.
 *
 * Storage is faked in-memory via the VerifyDb interface; the model client
 * is scripted; delivery is faked via the workflow-delivery seam. No
 * database, no network.
 */
import { z } from 'zod';

import { AI_COMMUNITY_MANAGER, AI_REVIEWER, AI_STAFF_ENABLED } from '@/lib/ai/flags';
import type { CostDeps } from '@/lib/ai/cost';
import type { ClubAIConfigRow } from '@/lib/ai/policy';
import type { AIClient, AgentDefinition } from '@/lib/ai/types';
import {
    setDeliveryDepsForTests,
    type DeliveryDeps,
} from '@/lib/ai/workflow-delivery';
import {
    buildSteps,
    buildWeeklyDigest,
    enqueueReengagementIfAtRisk,
    isoWeekKey,
    runWorkflow,
    WORKFLOW_NAMES,
    type WorkflowCtx,
    type WorkflowDeps,
    type WorkflowName,
} from '@/lib/ai/workflows';
import type {
    AIActionRow,
    NewAIActionRow,
    NewAIActionReviewRow,
    VerifyDb,
} from '@/lib/ai/verify';

let savedEnv: NodeJS.ProcessEnv;

beforeEach(() => {
    savedEnv = { ...process.env };
    process.env[AI_STAFF_ENABLED] = '1';
    process.env[AI_COMMUNITY_MANAGER] = '1';
    process.env[AI_REVIEWER] = '1';
});

afterEach(() => {
    process.env = savedEnv;
    setDeliveryDepsForTests(null);
    jest.restoreAllMocks();
});

const AGENT: AgentDefinition = {
    id: 'community-manager',
    role: 'Community Manager',
    mission: 'Keep the club warm.',
    contextSources: [],
    tools: [],
    permissions: [
        'send_welcome',
        'send_checkin',
        'post_digest',
        'notify_inactive',
        'grant_points',
        'enroll_challenge',
    ],
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

type MemoryDb = VerifyDb & {
    actions: AIActionRow[];
    reviews: NewAIActionReviewRow[];
};

/** In-memory VerifyDb with real unique-key behavior. */
function memoryDb(level: 1 | 2 | 3): MemoryDb {
    const actions: AIActionRow[] = [];
    const reviews: NewAIActionReviewRow[] = [];
    const state: MemoryDb = {
        actions,
        reviews,
        async getClubAIConfig() {
            return config(level);
        },
        async findActionByIdempotencyKey(key: string) {
            return actions.find((a) => a.idempotencyKey === key) ?? null;
        },
        async insertAction(row: NewAIActionRow) {
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

/** Scripted model client: returns the queued JSON responses in order. */
function scriptedClient(responses: unknown[]): AIClient {
    let i = 0;
    return {
        mock: true,
        async chat() {
            const r = responses[Math.min(i, responses.length - 1)];
            i += 1;
            return {
                content: JSON.stringify(r),
                usage: { promptTokens: 1, completionTokens: 1 },
            };
        },
    };
}

const EMPTY_COST: CostDeps = {
    db: {
        async getBudget() {
            return null;
        },
        async createBudget() {},
        async updateBudget() {},
        async insertUsage() {},
    },
};

interface DeliveryLog {
    notified: Array<{ userId: string; title: string; body: string }>;
    posts: Array<{ clubId: string; title: string; body: string }>;
    points: Array<{ userId: string; points: number }>;
}

function fakeDelivery(): { deps: DeliveryDeps; log: DeliveryLog } {
    const log: DeliveryLog = { notified: [], posts: [], points: [] };
    const deps: DeliveryDeps = {
        async notifyMember(n) {
            log.notified.push(n);
        },
        async postToClub(p) {
            log.posts.push(p);
            return { postId: 'post-1' };
        },
        async grantIncentivePoints(g) {
            log.points.push({ userId: g.userId, points: g.points });
        },
    };
    setDeliveryDepsForTests(deps);
    return { deps, log };
}

function workflowDeps(
    db: MemoryDb,
    clientResponses: unknown[],
    overrides: Partial<WorkflowDeps> = {},
): { deps: WorkflowDeps; log: DeliveryLog } {
    const { log } = fakeDelivery();
    const deps: WorkflowDeps = {
        db,
        agentDef: AGENT,
        client: scriptedClient(clientResponses),
        cost: EMPTY_COST,
        digestStats: {
            async countPostsSince() {
                return 7;
            },
            async countNewMembersSince() {
                return 2;
            },
        },
        listInactiveIds: async () => ['user-2', 'user-3'],
        assessChurn: async () => ({ atRisk: true, reason: 'inactive 20 days' }),
        ...overrides,
    };
    return { deps, log };
}

const welcomeCtx: WorkflowCtx = {
    clubId: 'club-1',
    memberId: 'user-1',
    idempotencyKey: 'welcome:club-1:user-1',
};

const PASS = { decision: 'pass', feedback: 'looks good' };
const ESCALATE = { decision: 'escalate', feedback: 'needs human eyes' };
const WELCOME_BODY = { body: '¡Bienvenido al club! 1) preséntate 2) reacciona 3) publica' };
const CHECKIN_BODY = { body: 'Te extrañamos, ¡vuelve!' };

describe('workflow registry', () => {
    test('exactly the three planned workflows exist', () => {
        expect([...WORKFLOW_NAMES].sort()).toEqual(['digest', 'reengagement', 'welcome']);
    });

    test('runWorkflow throws on unknown workflow name', async () => {
        const db = memoryDb(1);
        const { deps } = workflowDeps(db, []);
        await expect(
            runWorkflow('nope' as WorkflowName, welcomeCtx, deps),
        ).rejects.toThrow(/unknown workflow/i);
    });

    test('runWorkflow throws when the idempotency key is missing', async () => {
        const db = memoryDb(1);
        const { deps } = workflowDeps(db, []);
        await expect(
            runWorkflow('welcome', { clubId: 'c', memberId: 'u' } as WorkflowCtx, deps),
        ).rejects.toThrow(/idempotency/i);
    });

    test('welcome and reengagement require a memberId', async () => {
        const db = memoryDb(1);
        const { deps } = workflowDeps(db, []);
        await expect(
            runWorkflow('welcome', { clubId: 'c', idempotencyKey: 'k' }, deps),
        ).rejects.toThrow(/memberId/i);
        await expect(
            runWorkflow('reengagement', { clubId: 'c', idempotencyKey: 'k' }, deps),
        ).rejects.toThrow(/memberId/i);
    });
});

describe('buildSteps (pure step planning)', () => {
    test('welcome plans send_welcome + enroll_challenge', () => {
        const steps = buildSteps('welcome', { memberId: 'u', welcomeBody: 'hi' });
        expect(steps.map((s) => s.action)).toEqual(['send_welcome', 'enroll_challenge']);
        expect(steps[0].inputs).toMatchObject({ recipientId: 'u', body: 'hi' });
    });

    test('reengagement plans send_checkin + grant_points', () => {
        const steps = buildSteps('reengagement', {
            memberId: 'u',
            checkinBody: 'hi',
            incentivePoints: 10,
        });
        expect(steps.map((s) => s.action)).toEqual(['send_checkin', 'grant_points']);
        expect(steps[1].inputs).toMatchObject({ userId: 'u', points: 10 });
    });

    test('digest always posts; notifies only when there are inactive members', () => {
        const withInactive = buildSteps('digest', {
            title: 't',
            body: 'b',
            inactiveUserIds: ['a', 'b'],
        });
        expect(withInactive.map((s) => s.action)).toEqual(['post_digest', 'notify_inactive']);
        const without = buildSteps('digest', { title: 't', body: 'b', inactiveUserIds: [] });
        expect(without.map((s) => s.action)).toEqual(['post_digest']);
    });

    test('the same steps are planned at every level (the pipeline decides mode)', () => {
        const l1 = buildSteps('welcome', { memberId: 'u', welcomeBody: 'hi' });
        const l3 = buildSteps('welcome', { memberId: 'u', welcomeBody: 'hi' });
        expect(l1).toEqual(l3);
    });
});

describe('welcome workflow across proactivity levels', () => {
    test('L1: every step drafts — nothing is ever sent', async () => {
        const db = memoryDb(1);
        const { deps, log } = workflowDeps(db, [WELCOME_BODY]);
        const res = await runWorkflow('welcome', welcomeCtx, deps);

        expect(res.status).toBe('completed');
        expect(res.idempotentReplay).toBe(false);
        expect(res.steps).toHaveLength(2);
        expect(res.steps.every((s) => s.result.status === 'draft')).toBe(true);
        expect(log.notified).toHaveLength(0);
        // Drafts land in ai_actions for the AI Inbox
        expect(db.actions.filter((a) => a.status === 'draft')).toHaveLength(2);
    });

    test('L2: low-risk welcome auto-sends; medium enroll_challenge waits for approval', async () => {
        const db = memoryDb(2);
        const { deps, log } = workflowDeps(db, [WELCOME_BODY, ESCALATE]);
        const res = await runWorkflow('welcome', welcomeCtx, deps);

        expect(res.status).toBe('completed');
        const byAction = Object.fromEntries(res.steps.map((s) => [s.action, s.result.status]));
        expect(byAction['send_welcome']).toBe('executed');
        expect(byAction['enroll_challenge']).toBe('pending_approval');
        expect(log.notified).toHaveLength(1);
        expect(log.notified[0].userId).toBe('user-1');
        expect(log.notified[0].body).toContain('¡Bienvenido');
    });

    test('L3: welcome sends and enrolls (reviewer passes)', async () => {
        const db = memoryDb(3);
        const { deps, log } = workflowDeps(db, [WELCOME_BODY, PASS]);
        const res = await runWorkflow('welcome', welcomeCtx, deps);

        expect(res.status).toBe('completed');
        expect(res.steps.every((s) => s.result.status === 'executed')).toBe(true);
        // send_welcome + enroll_challenge notification
        expect(log.notified).toHaveLength(2);
    });
});

describe('reengagement workflow', () => {
    const ctx: WorkflowCtx = {
        clubId: 'club-1',
        memberId: 'user-9',
        idempotencyKey: 'reengagement:club-1:user-9:2026-W42',
    };

    test('L1: check-in drafts, incentive drafts — nothing sent, no points', async () => {
        const db = memoryDb(1);
        const { deps, log } = workflowDeps(db, [CHECKIN_BODY]);
        const res = await runWorkflow('reengagement', ctx, deps);

        expect(res.status).toBe('completed');
        expect(res.steps.every((s) => s.result.status === 'draft')).toBe(true);
        expect(log.notified).toHaveLength(0);
        expect(log.points).toHaveLength(0);
    });

    test('L2: check-in auto-sends; incentive waits for approval', async () => {
        const db = memoryDb(2);
        const { deps, log } = workflowDeps(db, [CHECKIN_BODY, ESCALATE]);
        const res = await runWorkflow('reengagement', ctx, deps);

        const byAction = Object.fromEntries(res.steps.map((s) => [s.action, s.result.status]));
        expect(byAction['send_checkin']).toBe('executed');
        expect(byAction['grant_points']).toBe('pending_approval');
        expect(log.notified).toHaveLength(1);
        expect(log.points).toHaveLength(0);
    });

    test('L3: check-in sends AND incentive points are granted', async () => {
        const db = memoryDb(3);
        const { deps, log } = workflowDeps(db, [CHECKIN_BODY, PASS]);
        const res = await runWorkflow('reengagement', ctx, deps);

        expect(res.status).toBe('completed');
        expect(res.steps.every((s) => s.result.status === 'executed')).toBe(true);
        expect(log.notified).toHaveLength(1);
        expect(log.notified[0].userId).toBe('user-9');
        expect(log.points).toHaveLength(1);
        expect(log.points[0]).toMatchObject({ userId: 'user-9', points: 10 });
    });
});

describe('digest workflow', () => {
    const ctx: WorkflowCtx = { clubId: 'club-1', idempotencyKey: 'digest:club-1:2026-W42' };

    test('buildWeeklyDigest is deterministic and honest (measured counts only)', async () => {
        const digest = await buildWeeklyDigest(
            'club-1',
            {
                async countPostsSince() {
                    return 7;
                },
                async countNewMembersSince() {
                    return 2;
                },
            },
            new Date('2026-10-15T12:00:00Z'),
        );
        expect(digest.title).toBe('Resumen semanal del club');
        expect(digest.body).toContain('7 publicaciones nuevas');
        expect(digest.body).toContain('2 miembros nuevos');
    });

    test('L1: digest drafts for creator review — never posted', async () => {
        const db = memoryDb(1);
        const { deps, log } = workflowDeps(db, []);
        const res = await runWorkflow('digest', ctx, deps);

        expect(res.status).toBe('completed');
        expect(res.steps.every((s) => s.result.status === 'draft')).toBe(true);
        expect(log.posts).toHaveLength(0);
        expect(log.notified).toHaveLength(0);
    });

    test('L2: digest auto-posts; inactive notify waits for approval', async () => {
        const db = memoryDb(2);
        const { deps, log } = workflowDeps(db, [ESCALATE]);
        const res = await runWorkflow('digest', ctx, deps);

        const byAction = Object.fromEntries(res.steps.map((s) => [s.action, s.result.status]));
        expect(byAction['post_digest']).toBe('executed');
        expect(byAction['notify_inactive']).toBe('pending_approval');
        expect(log.posts).toHaveLength(1);
        expect(log.posts[0].body).toContain('7 publicaciones nuevas');
        expect(log.notified).toHaveLength(0);
    });

    test('L3: digest posts AND inactive members are notified', async () => {
        const db = memoryDb(3);
        const { deps, log } = workflowDeps(db, [PASS]);
        const res = await runWorkflow('digest', ctx, deps);

        expect(res.status).toBe('completed');
        expect(res.steps.every((s) => s.result.status === 'executed')).toBe(true);
        expect(log.posts).toHaveLength(1);
        expect(log.notified.map((n) => n.userId).sort()).toEqual(['user-2', 'user-3']);
    });
});

describe('per-step verification isolation', () => {
    test('a blocked step does not abort its siblings', async () => {
        const db = memoryDb(3);
        // Agent missing grant_points permission: send_checkin runs, grant blocks.
        const limited: AgentDefinition = {
            ...AGENT,
            permissions: ['send_checkin'],
        };
        const { deps, log } = workflowDeps(db, [CHECKIN_BODY], { agentDef: limited });
        const res = await runWorkflow(
            'reengagement',
            { clubId: 'club-1', memberId: 'user-9', idempotencyKey: 're:iso' },
            deps,
        );

        const byAction = Object.fromEntries(res.steps.map((s) => [s.action, s.result.status]));
        expect(byAction['send_checkin']).toBe('executed');
        expect(byAction['grant_points']).toBe('blocked');
        expect(res.status).toBe('partial');
        expect(log.notified).toHaveLength(1);
        expect(log.points).toHaveLength(0);
    });

    test('a reviewer block stops that step but the workflow still completes partially', async () => {
        const db = memoryDb(3);
        const { deps } = workflowDeps(db, [WELCOME_BODY, { decision: 'block', feedback: 'no' }]);
        const res = await runWorkflow('welcome', welcomeCtx, deps);

        const byAction = Object.fromEntries(res.steps.map((s) => [s.action, s.result.status]));
        expect(byAction['send_welcome']).toBe('executed');
        expect(byAction['enroll_challenge']).toBe('blocked');
        expect(res.status).toBe('partial');
    });
});

describe('idempotency', () => {
    test('a second run with the same key replays without side effects', async () => {
        const db = memoryDb(3);
        const { deps, log } = workflowDeps(db, [WELCOME_BODY, PASS]);

        const first = await runWorkflow('welcome', welcomeCtx, deps);
        expect(first.idempotentReplay).toBe(false);
        expect(log.notified).toHaveLength(2);

        const second = await runWorkflow('welcome', welcomeCtx, deps);
        expect(second.idempotentReplay).toBe(true);
        expect(second.status).toBe(first.status);
        expect(second.steps).toHaveLength(0);
        expect(log.notified).toHaveLength(2);
        expect(db.actions).toHaveLength(2);
    });

    test('different idempotency keys run independently', async () => {
        const db = memoryDb(1);
        const { deps, log } = workflowDeps(db, [WELCOME_BODY, WELCOME_BODY]);
        await runWorkflow('welcome', welcomeCtx, deps);
        await runWorkflow('welcome', { ...welcomeCtx, idempotencyKey: 'other-key' }, deps);
        expect(db.actions).toHaveLength(4);
        expect(log.notified).toHaveLength(0);
    });
});

describe('isoWeekKey', () => {
    test('labels weeks as YYYY-Www', () => {
        // 2026-10-15 is a Thursday
        expect(isoWeekKey(new Date('2026-10-15T12:00:00Z'))).toBe('2026-W42');
        expect(isoWeekKey(new Date('2026-10-18T12:00:00Z'))).toBe('2026-W42');
        expect(isoWeekKey(new Date('2026-10-19T12:00:00Z'))).toBe('2026-W43');
    });
});

describe('enqueueReengagementIfAtRisk', () => {
    test('enqueues when the member is at risk', async () => {
        const enqueued: Array<{ workflowName: string; clubId: string; memberId?: string }> = [];
        const res = await enqueueReengagementIfAtRisk('club-1', 'user-9', {
            assess: async () => ({ atRisk: true, reason: 'inactive 20 days' }),
            enqueue: async (job) => {
                enqueued.push(job);
            },
            weekKey: '2026-W42',
        });

        expect(res.enqueued).toBe(true);
        expect(enqueued).toHaveLength(1);
        expect(enqueued[0]).toMatchObject({
            workflowName: 'reengagement',
            clubId: 'club-1',
            memberId: 'user-9',
            idempotencyKey: 'reengagement:club-1:user-9:2026-W42',
        });
    });

    test('does not enqueue when the member is healthy', async () => {
        const enqueued: unknown[] = [];
        const res = await enqueueReengagementIfAtRisk('club-1', 'user-9', {
            assess: async () => ({ atRisk: false, reason: 'active 2 days ago' }),
            enqueue: async (job) => {
                enqueued.push(job);
            },
            weekKey: '2026-W42',
        });

        expect(res.enqueued).toBe(false);
        expect(enqueued).toHaveLength(0);
    });
});
