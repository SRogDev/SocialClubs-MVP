/**
 * AI Inbox unit tests (master plan Phases 8, 9, 17, 18, 22, 23, 24).
 *
 * The inbox is the creator's trust center for the AI staff: it reads the
 * audit trail (`ai_actions` + `ai_action_reviews`, ADR-002 §5) — there is no
 * separate store. All storage is injected through the `InboxDb` interface so
 * these tests run against an in-memory implementation, no database.
 *
 * Covered:
 * - approve executes the action inline (via the registry executor) and
 *   records exactly one human `approved` review;
 * - reject records a human `rejected` review (with feedback) and NEVER
 *   executes;
 * - both decisions are idempotent: re-deciding a decided action performs no
 *   further writes and never re-executes;
 * - unknown action ids fail with NOT_FOUND;
 * - listing: pending (draft + pending_approval) newest-first with reviews,
 *   and the humanDecision filter backing the "Aprobadas" tab.
 */
import {
    approveAction,
    countPendingActions,
    getInboxAction,
    getPendingActions,
    listInboxActions,
    rejectAction,
    type AIActionReviewRow,
    type InboxDb,
} from '@/lib/ai/inbox';
import type { AIActionRow } from '@/lib/ai/verify';
import { ACTION_REGISTRY } from '@/lib/ai/actions';
import { ACTION_RISK } from '@/lib/ai/inbox-display';

interface MemoryStore {
    db: InboxDb;
    actions: Map<string, AIActionRow>;
    reviews: AIActionReviewRow[];
    updateCalls: string[];
}

function makeAction(overrides: Partial<AIActionRow> = {}): AIActionRow {
    return {
        id: 'action-1',
        clubId: 'club-1',
        agentId: 'community-manager',
        action: 'tag_post',
        inputs: { postId: 'post-1', tag: 'bienvenida' },
        idempotencyKey: 'ai:club-1:community-manager:tag_post:abc123',
        status: 'pending_approval',
        createdAt: '2026-10-15T12:00:00.000Z',
        ...overrides,
    };
}

function makeMemoryDb(seed: AIActionRow[] = []): MemoryStore {
    const actions = new Map<string, AIActionRow>(
        seed.map((a) => [a.id, { ...a }]),
    );
    const reviews: AIActionReviewRow[] = [];
    const updateCalls: string[] = [];
    let reviewSeq = 0;

    const db: InboxDb = {
        async getClubAIConfig() {
            return null;
        },
        async findActionByIdempotencyKey(key: string) {
            for (const a of actions.values()) {
                if (a.idempotencyKey === key) return a;
            }
            return null;
        },
        async insertAction(row) {
            const full: AIActionRow = {
                ...row,
                id: `action-${actions.size + 1}`,
                createdAt: new Date().toISOString(),
            };
            actions.set(full.id, full);
            return full;
        },
        async updateAction(id: string, patch) {
            updateCalls.push(id);
            const current = actions.get(id);
            if (!current) throw new Error(`missing action ${id}`);
            actions.set(id, { ...current, ...patch });
        },
        async insertReview(row) {
            reviewSeq += 1;
            reviews.push({
                id: `review-${reviewSeq}`,
                actionId: row.actionId,
                reviewerType: row.reviewerType,
                reviewerId: row.reviewerId ?? null,
                decision: row.decision,
                feedback: row.feedback ?? null,
                createdAt: new Date().toISOString(),
            });
        },
        async getActionById(id: string) {
            return actions.get(id) ?? null;
        },
        async listActionsByStatus(clubId: string, statuses: string[]) {
            return [...actions.values()]
                .filter(
                    (a) => a.clubId === clubId && statuses.includes(a.status),
                )
                .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
        },
        async listReviews(actionIds: string[]) {
            return reviews.filter((r) => actionIds.includes(r.actionId));
        },
    };
    return { db, actions, reviews, updateCalls };
}

describe('approveAction', () => {
    it('executes the action inline and records one human approved review', async () => {
        const { db, actions, reviews } = makeMemoryDb([makeAction()]);

        const res = await approveAction('action-1', 'reviewer-1', { db }, 'Se ve bien');

        expect(res).toMatchObject({
            actionId: 'action-1',
            status: 'executed',
            idempotent: false,
        });
        const row = actions.get('action-1');
        expect(row?.status).toBe('executed');
        // The registry executor really ran: its result is in the audit row.
        const execResult = row?.executionResult as
            | { result?: { ok?: boolean; stub?: boolean } }
            | undefined;
        expect(execResult?.result?.ok).toBe(true);
        expect(execResult?.result?.stub).toBe(true);
        // Exactly one human review, with the feedback.
        expect(reviews).toHaveLength(1);
        expect(reviews[0]).toMatchObject({
            actionId: 'action-1',
            reviewerType: 'human',
            reviewerId: 'reviewer-1',
            decision: 'approved',
            feedback: 'Se ve bien',
        });
    });

    it('also approves draft actions (L1 advisor drafts land in the inbox)', async () => {
        const { db, actions } = makeMemoryDb([
            makeAction({ id: 'draft-1', status: 'draft' }),
        ]);

        const res = await approveAction('draft-1', 'reviewer-1', { db });

        expect(res.status).toBe('executed');
        expect(actions.get('draft-1')?.status).toBe('executed');
    });

    it('is idempotent: a second approve neither re-executes nor duplicates the review', async () => {
        const { db, reviews, updateCalls } = makeMemoryDb([makeAction()]);

        const first = await approveAction('action-1', 'reviewer-1', { db });
        const updatesAfterFirst = updateCalls.length;

        const second = await approveAction('action-1', 'reviewer-1', { db });

        expect(second).toMatchObject({
            actionId: first.actionId,
            status: 'executed',
            idempotent: true,
        });
        expect(updateCalls.length).toBe(updatesAfterFirst);
        expect(reviews).toHaveLength(1);
    });

    it('fails closed (marks failed) when the action is not in the registry', async () => {
        const { db, actions, reviews } = makeMemoryDb([
            makeAction({ action: 'definitely_not_an_action' }),
        ]);

        const res = await approveAction('action-1', 'reviewer-1', { db });

        expect(res.status).toBe('failed');
        expect(actions.get('action-1')?.status).toBe('failed');
        // The human decision is still audited even though execution failed.
        expect(reviews).toHaveLength(1);
        expect(reviews[0].decision).toBe('approved');
    });

    it('throws NOT_FOUND for an unknown action id', async () => {
        const { db } = makeMemoryDb();

        await expect(
            approveAction('missing', 'reviewer-1', { db }),
        ).rejects.toMatchObject({ code: 'NOT_FOUND' });
    });
});

describe('rejectAction', () => {
    it('records a human rejected review with feedback and never executes', async () => {
        const { db, actions, reviews } = makeMemoryDb([makeAction()]);

        const res = await rejectAction(
            'action-1',
            'reviewer-1',
            { db },
            'Demasiado pronto',
        );

        expect(res).toMatchObject({
            actionId: 'action-1',
            status: 'rejected',
            idempotent: false,
        });
        const row = actions.get('action-1');
        expect(row?.status).toBe('rejected');
        // Never executed: execution_result carries the reason, never a result.
        expect(row?.executionResult).toMatchObject({ reason: 'Demasiado pronto' });
        expect(row?.executionResult).not.toHaveProperty('result');
        expect(reviews).toHaveLength(1);
        expect(reviews[0]).toMatchObject({
            actionId: 'action-1',
            reviewerType: 'human',
            reviewerId: 'reviewer-1',
            decision: 'rejected',
            feedback: 'Demasiado pronto',
        });
    });

    it('rejects drafts too', async () => {
        const { db, actions, reviews } = makeMemoryDb([
            makeAction({ id: 'draft-1', status: 'draft' }),
        ]);

        const res = await rejectAction('draft-1', 'reviewer-1', { db });

        expect(res.status).toBe('rejected');
        expect(actions.get('draft-1')?.status).toBe('rejected');
        expect(reviews).toHaveLength(1);
    });

    it('is idempotent: a second reject performs no further writes', async () => {
        const { db, reviews, updateCalls } = makeMemoryDb([makeAction()]);

        await rejectAction('action-1', 'reviewer-1', { db }, 'no');
        const updatesAfterFirst = updateCalls.length;

        const second = await rejectAction('action-1', 'reviewer-1', { db }, 'no');

        expect(second).toMatchObject({
            actionId: 'action-1',
            status: 'rejected',
            idempotent: true,
        });
        expect(updateCalls.length).toBe(updatesAfterFirst);
        expect(reviews).toHaveLength(1);
    });

    it('cannot resurrect an executed action', async () => {
        const { db, actions } = makeMemoryDb([makeAction()]);

        await approveAction('action-1', 'reviewer-1', { db });
        const res = await rejectAction('action-1', 'reviewer-1', { db }, 'uy');

        expect(res).toMatchObject({ status: 'executed', idempotent: true });
        expect(actions.get('action-1')?.status).toBe('executed');
    });

    it('throws NOT_FOUND for an unknown action id', async () => {
        const { db } = makeMemoryDb();

        await expect(
            rejectAction('missing', 'reviewer-1', { db }),
        ).rejects.toMatchObject({ code: 'NOT_FOUND' });
    });
});

describe('display data', () => {
    it('ACTION_RISK mirrors the registry risk assignments (no drift)', () => {
        for (const [name, def] of Object.entries(ACTION_REGISTRY)) {
            expect(ACTION_RISK[name]).toBe(def.risk);
        }
    });
});

describe('listing', () => {
    it('getPendingActions returns drafts + pending_approval newest-first with reviews', async () => {
        const { db } = makeMemoryDb([
            makeAction({ id: 'old-pending', createdAt: '2026-10-15T10:00:00.000Z' }),
            makeAction({
                id: 'new-draft',
                status: 'draft',
                createdAt: '2026-10-15T12:00:00.000Z',
            }),
            makeAction({
                id: 'done',
                status: 'executed',
                createdAt: '2026-10-15T13:00:00.000Z',
            }),
            makeAction({
                id: 'other-club',
                clubId: 'club-2',
                createdAt: '2026-10-15T14:00:00.000Z',
            }),
        ]);
        await rejectAction('old-pending', 'reviewer-1', { db }, 'no');

        const items = await getPendingActions('club-1', { db });

        expect(items.map((i) => i.id)).toEqual(['new-draft']);
        // Reviews travel with the item.
        const rejected = await listInboxActions(
            'club-1',
            { db },
            { statuses: ['rejected'] },
        );
        expect(rejected).toHaveLength(1);
        expect(rejected[0].reviews).toHaveLength(1);
        expect(rejected[0].reviews[0].decision).toBe('rejected');
    });

    it('humanDecision=approved backs the Aprobadas tab (executed + human approval)', async () => {
        const { db } = makeMemoryDb([
            makeAction({ id: 'a1' }),
            makeAction({ id: 'a2' }),
        ]);
        await approveAction('a1', 'reviewer-1', { db });
        // a2 was executed by the pipeline itself — no human review.
        db.updateAction('a2', { status: 'executed' });

        const items = await listInboxActions(
            'club-1',
            { db },
            { statuses: ['executed'], humanDecision: 'approved' },
        );

        expect(items.map((i) => i.id)).toEqual(['a1']);
    });

    it('countPendingActions counts drafts + pending_approval for the badge', async () => {
        const { db } = makeMemoryDb([
            makeAction({ id: 'p1' }),
            makeAction({ id: 'p2', status: 'draft' }),
            makeAction({ id: 'p3', status: 'executed' }),
        ]);

        await expect(countPendingActions('club-1', { db })).resolves.toBe(2);
    });

    it('getInboxAction returns the action with its reviews, or null', async () => {
        const { db } = makeMemoryDb([makeAction()]);
        await rejectAction('action-1', 'reviewer-1', { db }, 'no');

        const item = await getInboxAction('action-1', { db });

        expect(item?.id).toBe('action-1');
        expect(item?.reviews).toHaveLength(1);
        await expect(getInboxAction('missing', { db })).resolves.toBeNull();
    });
});

describe('correction feedback loop (Phases 63-66)', () => {
    function stubMemoryDb() {
        const upserted: Array<{ clubId: string; agentId: string; key: string; value: unknown; source: string }> = [];
        const feedback: Array<{ actionId: string | null; type: string; content: string; userId: string }> = [];
        const db: import('@/lib/ai/memory').MemoryDb = {
            async upsertMemory(row) {
                upserted.push({
                    clubId: row.club_id,
                    agentId: row.agent_id,
                    key: row.key,
                    value: row.value,
                    source: row.source ?? 'learned',
                });
                return {
                    id: `mem-${upserted.length}`,
                    club_id: row.club_id,
                    agent_id: row.agent_id,
                    key: row.key,
                    value: row.value,
                    source: (row.source ?? 'learned') as 'correction' | 'learned' | 'config',
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                };
            },
            async getMemory() {
                return null;
            },
            async listMemories() {
                return [];
            },
            async deleteMemory() {
                return false;
            },
            async insertFeedback(row) {
                feedback.push({
                    actionId: row.action_id ?? null,
                    type: row.feedback_type,
                    content: row.content,
                    userId: row.created_by,
                });
                return {
                    id: `fb-${feedback.length}`,
                    action_id: row.action_id ?? null,
                    feedback_type: row.feedback_type,
                    content: row.content,
                    created_by: row.created_by,
                    created_at: new Date().toISOString(),
                };
            },
        };
        return { db, upserted, feedback };
    }

    it('reject with feedback distills a correction memory so the agent does not repeat the mistake', async () => {
        const { db, actions } = makeMemoryDb([makeAction()]);
        const mem = stubMemoryDb();

        const res = await rejectAction(
            'action-1',
            'reviewer-1',
            { db, memory: { db: mem.db } },
            'Too long — keep announcements under 100 words.',
        );

        expect(res.status).toBe('rejected');
        expect(actions.get('action-1')?.status).toBe('rejected');
        // The feedback is logged…
        expect(mem.feedback).toHaveLength(1);
        expect(mem.feedback[0]).toMatchObject({
            actionId: 'action-1',
            type: 'correction',
            userId: 'reviewer-1',
        });
        // …and distilled into a club+agent-scoped correction memory.
        expect(mem.upserted).toHaveLength(1);
        expect(mem.upserted[0]).toMatchObject({
            clubId: 'club-1',
            agentId: 'community-manager',
            source: 'correction',
        });
        expect(mem.upserted[0].key).toContain('length');
    });

    it('approve with feedback records praise as a learned memory', async () => {
        const { db } = makeMemoryDb([makeAction()]);
        const mem = stubMemoryDb();

        const res = await approveAction(
            'action-1',
            'reviewer-1',
            { db, memory: { db: mem.db } },
            'Love the short titles.',
        );

        expect(res.status).toBe('executed');
        expect(mem.feedback[0]).toMatchObject({ type: 'praise', userId: 'reviewer-1' });
        expect(mem.upserted).toHaveLength(1);
        expect(mem.upserted[0]).toMatchObject({
            clubId: 'club-1',
            agentId: 'community-manager',
            source: 'learned',
        });
        expect(mem.upserted[0].key).toContain('title');
    });

    it('no memory is created when the decision has no feedback', async () => {
        const { db } = makeMemoryDb([makeAction()]);
        const mem = stubMemoryDb();

        await rejectAction('action-1', 'reviewer-1', { db, memory: { db: mem.db } });

        expect(mem.feedback).toHaveLength(0);
        expect(mem.upserted).toHaveLength(0);
    });

    it('a memory failure never breaks the review', async () => {
        const { db, actions } = makeMemoryDb([makeAction()]);
        const failing = stubMemoryDb();
        failing.db.upsertMemory = async () => {
            throw new Error('memory down');
        };
        failing.db.insertFeedback = async () => {
            throw new Error('memory down');
        };

        const res = await rejectAction(
            'action-1',
            'reviewer-1',
            { db, memory: { db: failing.db } },
            'Too formal.',
        );

        expect(res.status).toBe('rejected');
        expect(actions.get('action-1')?.status).toBe('rejected');
    });
});
