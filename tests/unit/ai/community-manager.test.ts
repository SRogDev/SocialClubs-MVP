/**
 * Community Manager v0 capabilities (master plan Phases 4-7, 10, 16, 20, 21).
 *
 * Covers the three capabilities in lib/ai/agents/community-manager.ts:
 *  - answerFAQ: grounded answers from club_ai_config.policies.faq, with a
 *    deterministic no_faq_configured short-circuit (no wasted LLM call);
 *    the FAQ entries must reach the model so it can answer ONLY from them.
 *  - draftOnboarding: personalized welcome draft via send_message; at
 *    proactivity L1 the pipeline must store a draft and NEVER execute.
 *  - draftSignalResponse: new_post -> comment_post draft, member_joined ->
 *    onboarding send_message draft; unknown types are rejected.
 *
 * Storage is faked in-memory via the VerifyDb interface; the model client
 * is a stub. No database, no network.
 */
import {
    AI_COMMUNITY_MANAGER,
    AI_STAFF_ENABLED,
} from '@/lib/ai/flags';
import type { CostDb, CostDeps } from '@/lib/ai/cost';
import type { ClubAIConfigRow } from '@/lib/ai/policy';
import type { AIClient } from '@/lib/ai/types';
import type { AiMemory, MemoryDb } from '@/lib/ai/memory';
import {
    answerFAQ,
    draftOnboarding,
    draftSignalResponse,
} from '@/lib/ai/agents/community-manager';
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
});

afterEach(() => {
    process.env = savedEnv;
    jest.restoreAllMocks();
});

const FAQ = [
    { q: '¿Cuánto cuesta unirse?', a: 'La membresía cuesta $10 al mes.' },
    { q: '¿Cuándo son los eventos?', a: 'Todos los viernes a las 6pm.' },
];

function config(policies: Record<string, unknown>, level: 1 | 2 | 3 = 1): ClubAIConfigRow {
    return {
        clubId: 'club-1',
        proactivityLevel: level,
        enabledAgents: ['community-manager'],
        tone: 'friendly',
        policies,
        updatedAt: new Date(0).toISOString(),
    };
}

/** In-memory VerifyDb (also serves as the club_ai_config reader). */
function memoryDb(
    policies: Record<string, unknown>,
    level: 1 | 2 | 3 = 1,
): VerifyDb & { actions: AIActionRow[] } {
    const actions: AIActionRow[] = [];
    const state: VerifyDb & { actions: AIActionRow[] } = {
        actions,
        async getClubAIConfig() {
            return config(policies, level);
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
        async insertReview(_row: NewAIActionReviewRow) {
            // Draft mode never reaches the reviewer; no-op.
        },
    };
    return state;
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

function costDeps(): CostDeps {
    return { db: emptyCostDb() };
}

interface StubClient {
    client: AIClient;
    calls: number;
    lastUserPayload: () => Record<string, unknown>;
}

/** Deterministic model stub: returns `response` as JSON, records requests. */
function stubClient(response: unknown): StubClient {
    const seen: Array<{ messages: Array<{ role: string; content: string }> }> = [];
    const client: AIClient = {
        mock: true,
        async chat(req) {
            seen.push({
                messages: req.messages.map((m) => ({ role: m.role, content: m.content })),
            });
            return {
                content: JSON.stringify(response),
                usage: { promptTokens: 10, completionTokens: 20 },
            };
        },
    };
    return {
        client,
        get calls() {
            return seen.length;
        },
        lastUserPayload: () => {
            const last = seen[seen.length - 1];
            const userMsg = last.messages.find((m) => m.role === 'user');
            return JSON.parse(userMsg?.content ?? '{}') as Record<string, unknown>;
        },
    };
}

// ---------------------------------------------------------------------------
// answerFAQ
// ---------------------------------------------------------------------------

describe('answerFAQ', () => {
    test('no FAQ configured -> { answer: null, reason: no_faq_configured }, model never called', async () => {
        const db = memoryDb({});
        const stub = stubClient({ answer: 'x', grounded: true, confidence: 1 });

        const res = await answerFAQ('¿Cuánto cuesta?', 'club-1', {
            db,
            client: stub.client,
            cost: costDeps(),
        });

        expect(res.answer).toBeNull();
        expect(res.reason).toBe('no_faq_configured');
        expect(stub.calls).toBe(0);
    });

    test('malformed policies.faq is treated as not configured', async () => {
        const db = memoryDb({ faq: 'not-an-array' });
        const stub = stubClient({ answer: 'x', grounded: true, confidence: 1 });

        const res = await answerFAQ('¿Cuánto cuesta?', 'club-1', {
            db,
            client: stub.client,
            cost: costDeps(),
        });

        expect(res.answer).toBeNull();
        expect(res.reason).toBe('no_faq_configured');
        expect(stub.calls).toBe(0);
    });

    test('the FAQ entries are handed to the model so it can answer ONLY from them', async () => {
        const db = memoryDb({ faq: FAQ });
        const stub = stubClient({
            answer: 'Cuesta $10 al mes.',
            grounded: true,
            confidence: 0.92,
        });

        const res = await answerFAQ('¿Cuánto cuesta unirse?', 'club-1', {
            db,
            client: stub.client,
            cost: costDeps(),
        });

        expect(stub.calls).toBe(1);
        const payload = stub.lastUserPayload();
        expect(payload['payload']).toMatchObject({ question: '¿Cuánto cuesta unirse?', faq: FAQ });
        expect(res.answer).toBe('Cuesta $10 al mes.');
        expect(res.grounded).toBe(true);
        expect(res.confidence).toBe(0.92);
    });

    test('a "no lo sé" model answer is surfaced as ungrounded', async () => {
        const db = memoryDb({ faq: FAQ });
        const stub = stubClient({ answer: 'No lo sé', grounded: false, confidence: 0.2 });

        const res = await answerFAQ('¿Hay piscina?', 'club-1', {
            db,
            client: stub.client,
            cost: costDeps(),
        });

        expect(res.answer).toBe('No lo sé');
        expect(res.grounded).toBe(false);
    });
});

// ---------------------------------------------------------------------------
// draftOnboarding
// ---------------------------------------------------------------------------

describe('draftOnboarding', () => {
    test('at L1 the welcome is a DRAFT: stored in ai_actions, never executed', async () => {
        const db = memoryDb({});
        const stub = stubClient({
            body: '¡Hola Ana! Bienvenida a Club Demo. Tus 3 primeros pasos: 1) preséntate, 2) explora los canales, 3) únete al evento del viernes.',
        });

        const res = await draftOnboarding(
            { userId: 'user-9', clubId: 'club-1', memberName: 'Ana', clubName: 'Club Demo' },
            { db, client: stub.client, cost: costDeps() },
        );

        // The safety property: draft-only, never executed.
        expect(res.status).toBe('draft');
        expect(res.status).not.toBe('executed');
        expect(res.actionId).toBeDefined();

        expect(db.actions).toHaveLength(1);
        const row = db.actions[0];
        expect(row.agentId).toBe('community-manager');
        expect(row.action).toBe('send_message');
        expect(row.status).toBe('draft');
        expect(row.inputs).toMatchObject({ recipientId: 'user-9', channel: 'dm' });
        const draft = (row.executionResult as { draft?: { body?: string } })?.draft;
        expect(draft?.body).toContain('Ana');
        // The member name reached the model so the draft is personalized.
        const payload = stub.lastUserPayload();
        expect(JSON.stringify(payload)).toContain('Ana');
    });
});

// ---------------------------------------------------------------------------
// draftSignalResponse
// ---------------------------------------------------------------------------

describe('draftSignalResponse', () => {
    test('new_post -> comment_post draft on the post, stored as draft', async () => {
        const db = memoryDb({});
        const stub = stubClient({ body: '¡Qué buen aporte! Cuéntanos más.' });

        const res = await draftSignalResponse(
            {
                type: 'new_post',
                clubId: 'club-1',
                payload: { postId: 'post-1', authorId: 'user-1' },
            },
            { db, client: stub.client, cost: costDeps() },
        );

        expect(res.status).toBe('draft');
        expect(res.status).not.toBe('executed');
        expect(db.actions).toHaveLength(1);
        const row = db.actions[0];
        expect(row.action).toBe('comment_post');
        expect(row.status).toBe('draft');
        expect(row.inputs).toMatchObject({ postId: 'post-1' });
    });

    test('member_joined -> send_message onboarding draft to the new member', async () => {
        const db = memoryDb({});
        const stub = stubClient({ body: '¡Bienvenido al club!' });

        const res = await draftSignalResponse(
            {
                type: 'member_joined',
                clubId: 'club-1',
                payload: { userId: 'user-2' },
            },
            { db, client: stub.client, cost: costDeps() },
        );

        expect(res.status).toBe('draft');
        expect(db.actions).toHaveLength(1);
        const row = db.actions[0];
        expect(row.action).toBe('send_message');
        expect(row.inputs).toMatchObject({ recipientId: 'user-2' });
    });

    test('unsupported signal type -> rejected, no ai_actions row', async () => {
        const db = memoryDb({});
        const stub = stubClient({ body: 'x' });

        const res = await draftSignalResponse(
            {
                type: 'points_milestone',
                clubId: 'club-1',
                payload: { userId: 'user-3' },
            },
            { db, client: stub.client, cost: costDeps() },
        );

        expect(res.status).toBe('rejected');
        expect(db.actions).toHaveLength(0);
        expect(stub.calls).toBe(0);
    });
});

// ---------------------------------------------------------------------------
// agent memory context (Phases 63-66)
// ---------------------------------------------------------------------------

describe('agent memory context', () => {
    function memoryRow(overrides: Partial<AiMemory>): AiMemory {
        return {
            id: 'mem-1',
            club_id: 'club-1',
            agent_id: 'community-manager',
            key: 'correction-tone',
            value: { preference: 'playful, not corporate', polarity: 'avoid' },
            source: 'correction',
            created_at: '2026-10-15T12:00:00.000Z',
            updated_at: '2026-10-15T12:00:00.000Z',
            ...overrides,
        };
    }

    function stubMemoryDb(rows: AiMemory[]): MemoryDb {
        return {
            async upsertMemory() {
                throw new Error('not needed');
            },
            async getMemory() {
                return null;
            },
            async listMemories(clubId: string, agentId: string) {
                return rows.filter(
                    (r) => r.club_id === clubId && r.agent_id === agentId,
                );
            },
            async deleteMemory() {
                return false;
            },
            async insertFeedback() {
                throw new Error('not needed');
            },
        };
    }

    test('draftOnboarding includes the memory section in the prompt context', async () => {
        const db = memoryDb({});
        const stub = stubClient({ body: '¡Hola! Bienvenido.' });

        const res = await draftOnboarding(
            { userId: 'user-9', clubId: 'club-1' },
            {
                db,
                client: stub.client,
                cost: costDeps(),
                memory: { db: stubMemoryDb([memoryRow({})]) },
            },
        );

        expect(res.status).toBe('draft');
        const inner = stub.lastUserPayload()['payload'] as Record<string, unknown>;
        expect(String(inner['memorySummary'])).toMatch(/correction-tone/);
        expect(String(inner['memorySummary'])).toMatch(/playful, not corporate/);
    });

    test('a memory lookup failure degrades to the no-memories branch, never blocking the draft', async () => {
        const db = memoryDb({});
        const stub = stubClient({ body: '¡Hola! Bienvenido.' });
        const failing: MemoryDb = {
            async upsertMemory() {
                throw new Error('nope');
            },
            async getMemory() {
                throw new Error('nope');
            },
            async listMemories() {
                throw new Error('nope');
            },
            async deleteMemory() {
                throw new Error('nope');
            },
            async insertFeedback() {
                throw new Error('nope');
            },
        };

        const res = await draftOnboarding(
            { userId: 'user-9', clubId: 'club-1' },
            { db, client: stub.client, cost: costDeps(), memory: { db: failing } },
        );

        expect(res.status).toBe('draft');
        const inner = stub.lastUserPayload()['payload'] as Record<string, unknown>;
        expect(String(inner['memorySummary'])).toMatch(/No learned memories/);
    });
});
