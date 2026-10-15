/**
 * AI signal/trigger layer tests (master plan Phase 19).
 *
 * Covers:
 *  - emitSignal: 24h dedup window (same dedup_key -> { deduped: true }, 1 row)
 *  - emitSignal: re-arm after the window expires
 *  - emitSignal: unique-violation race -> deduped, never throws
 *  - dispatchSignal: persists, skips QStash delivery when not configured (dev mode)
 *  - dispatchSignal: publishes { signalId } to the QStash worker when configured
 *  - dispatchSignal: never throws when Supabase env is missing
 *  - SIGNAL_ROUTING: completeness — the deterministic table covers the
 *    remaining signal types (points_milestone): every route points at a
 *    real agent + a real action, and the composed inputs satisfy the
 *    action's schema. new_post / member_joined are agent-composed in the
 *    worker (lib/ai/agents/community-manager.ts) and tested separately.
 *  - Worker route POST: HMAC-ok -> new_post/member_joined delegate to
 *    draftSignalResponse; other routed types use verifyAndExecute;
 *    signal marked processed; unknown signal type / already-processed ->
 *    no agent run, still 200
 *
 * Storage is faked in-memory via the SignalDb interface — no database needed.
 */
import { NextRequest } from 'next/server';

import { POST } from '@/app/api/queues/ai-signals/route';
import { ACTION_REGISTRY } from '@/lib/ai/actions';
import { AGENTS } from '@/lib/ai/agents';
import { dispatchSignal } from '@/lib/ai/signal-dispatch';
import {
    emitSignal,
    getSignalById,
    markSignalProcessed,
    SIGNAL_DEDUP_WINDOW_MS,
    SIGNAL_ROUTING,
    type AISignalRecord,
    type EmitInput,
    type SignalDb,
    type SignalDeps,
} from '@/lib/ai/signals';

// ---------------------------------------------------------------------------
// Fakes
// ---------------------------------------------------------------------------

function fakeDb(now: () => Date = () => new Date()): SignalDb & { rows: Map<string, AISignalRecord> } {
    const rows = new Map<string, AISignalRecord>();
    let n = 0;
    return {
        rows,
        async findByDedupKey(dedupKey: string) {
            for (const r of rows.values()) {
                if (r.dedupKey === dedupKey) return { ...r };
            }
            return null;
        },
        async insertSignal(row) {
            const rec: AISignalRecord = {
                id: `sig-${++n}`,
                type: row.type,
                clubId: row.clubId,
                payload: row.payload,
                dedupKey: row.dedupKey,
                processedAt: null,
                createdAt: now().toISOString(),
            };
            rows.set(rec.id, rec);
            return { ...rec };
        },
        async updateSignal(id: string, patch) {
            const r = rows.get(id);
            if (!r) throw new Error(`signal ${id} not found`);
            if (patch.payload !== undefined) r.payload = patch.payload;
            if (patch.processedAt !== undefined) r.processedAt = patch.processedAt;
            if (patch.createdAt !== undefined) r.createdAt = patch.createdAt;
        },
        async getSignalById(id: string) {
            const r = rows.get(id);
            return r ? { ...r } : null;
        },
    };
}

function deps(db: SignalDb, now?: () => Date): SignalDeps {
    return now ? { db, now } : { db };
}

const NEW_POST: EmitInput = {
    type: 'new_post',
    clubId: 'club-1',
    payload: { postId: 'post-1', authorId: 'user-1' },
    dedupKey: 'new_post:post-1',
};

let savedEnv: NodeJS.ProcessEnv;

beforeEach(() => {
    savedEnv = { ...process.env };
    delete process.env.QSTASH_TOKEN;
    delete process.env.NEXT_PUBLIC_SITE_URL;
    delete process.env.VERCEL_URL;
});

afterEach(() => {
    process.env = savedEnv;
    jest.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// emitSignal — dedup
// ---------------------------------------------------------------------------

describe('emitSignal', () => {
    test('same dedup_key within 24h -> second emit is deduped, still 1 row', async () => {
        const db = fakeDb();
        const first = await emitSignal(NEW_POST, deps(db));
        expect(first.deduped).toBe(false);

        const second = await emitSignal(NEW_POST, deps(db));
        expect(second.deduped).toBe(true);
        expect(second.signal.id).toBe(first.signal.id);
        expect(db.rows.size).toBe(1);
    });

    test('dedup_key older than 24h -> re-armed as a fresh signal', async () => {
        const t0 = new Date('2026-10-15T10:00:00Z');
        const db = fakeDb(() => t0);
        const first = await emitSignal(NEW_POST, deps(db, () => t0));
        await markSignalProcessed(first.signal.id, deps(db, () => t0));
        expect((await getSignalById(first.signal.id, deps(db)))?.processedAt).not.toBeNull();

        const t1 = new Date(t0.getTime() + SIGNAL_DEDUP_WINDOW_MS + 60_000);
        const second = await emitSignal(
            { ...NEW_POST, payload: { postId: 'post-1', authorId: 'user-1', retry: true } },
            deps(db, () => t1),
        );
        expect(second.deduped).toBe(false);
        expect(second.signal.id).toBe(first.signal.id); // same row, re-armed
        expect(second.signal.processedAt).toBeNull();
        expect(second.signal.payload).toEqual({
            postId: 'post-1',
            authorId: 'user-1',
            retry: true,
        });
        expect(new Date(second.signal.createdAt).getTime()).toBe(t1.getTime());
        expect(db.rows.size).toBe(1);
    });

    test('unique-violation race on insert -> deduped, never throws', async () => {
        const db = fakeDb();
        const first = await emitSignal(NEW_POST, deps(db));

        // Simulate a concurrent duplicate winning the insert race:
        // findByDedupKey misses, insert throws 23505.
        const racyDb: SignalDb = {
            ...db,
            findByDedupKey: jest.fn(async () => null),
            insertSignal: jest.fn(async () => {
                const err = new Error('duplicate key') as Error & { code: string };
                err.code = '23505';
                throw err;
            }),
        };
        // ...but the row is actually there when we look again.
        (racyDb.findByDedupKey as jest.Mock)
            .mockResolvedValueOnce(null)
            .mockResolvedValue({ ...first.signal });

        const res = await emitSignal(NEW_POST, { db: racyDb });
        expect(res.deduped).toBe(true);
        expect(res.signal.id).toBe(first.signal.id);
    });

    test('different dedup keys -> separate rows', async () => {
        const db = fakeDb();
        await emitSignal(NEW_POST, deps(db));
        const other = await emitSignal(
            { ...NEW_POST, dedupKey: 'new_post:post-2', payload: { postId: 'post-2' } },
            deps(db),
        );
        expect(other.deduped).toBe(false);
        expect(db.rows.size).toBe(2);
    });
});

// ---------------------------------------------------------------------------
// dispatchSignal
// ---------------------------------------------------------------------------

// The repo's jest env is jsdom, where next/server's web-spec extensions cannot
// load (no global Request). The worker route only needs NextRequest
// construction and NextResponse.json, so a minimal mock suffices.
jest.mock('next/server', () => {
    class MockNextRequest {
        private _body: string;
        readonly headers: { get: (name: string) => string | null };
        constructor(
            _url: string,
            init?: { method?: string; body?: string; headers?: Record<string, string> },
        ) {
            this._body = init?.body ?? '';
            const h = new Map<string, string>();
            for (const [k, v] of Object.entries(init?.headers ?? {})) {
                h.set(k.toLowerCase(), v);
            }
            this.headers = { get: (name: string) => h.get(name.toLowerCase()) ?? null };
        }
        async text(): Promise<string> {
            return this._body;
        }
    }
    return {
        NextRequest: MockNextRequest,
        NextResponse: {
            json: (body: unknown, init?: { status?: number }) => ({
                status: init?.status ?? 200,
                json: async () => body,
            }),
        },
    };
});

const mockQstashState = {
    publishCalls: [] as Array<{ url: string; body: unknown }>,
    signatureValid: true,
};

jest.mock('@upstash/qstash', () => ({
    Client: jest.fn().mockImplementation(() => ({
        publishJSON: jest.fn(async (args: { url: string; body: unknown }) => {
            mockQstashState.publishCalls.push(args);
            return { messageId: 'msg-1' };
        }),
    })),
    Receiver: jest.fn().mockImplementation(() => ({
        verify: jest.fn(async () => mockQstashState.signatureValid),
    })),
}));

const mockSignalStore = { signals: new Map<string, AISignalRecord>() };
const mockGetSignalById = jest.fn(
    async (id: string, _deps?: unknown): Promise<AISignalRecord | null> =>
        mockSignalStore.signals.get(id) ?? null,
);
const mockMarkSignalProcessed = jest.fn(async (id: string, _deps?: unknown): Promise<void> => {
    const s = mockSignalStore.signals.get(id);
    if (s) s.processedAt = new Date().toISOString();
});

jest.mock('@/lib/ai/signals', () => {
    const actual = jest.requireActual('@/lib/ai/signals');
    return {
        ...actual,
        getSignalById: (id: string, deps: unknown) => mockGetSignalById(id, deps),
        markSignalProcessed: (id: string, deps: unknown) => mockMarkSignalProcessed(id, deps),
        supabaseSignalDb: jest.fn(() => ({})),
    };
});

const mockVerifyAndExecute = jest.fn(
    async (_req: {
        agentDef: { id: string };
        action: string;
        inputs: Record<string, unknown>;
        ctx: { clubId: string; idempotencyKey?: string };
    }) => ({
        status: 'draft' as const,
        actionId: 'action-1',
    }),
);

jest.mock('@/lib/ai/verify', () => {
    const actual = jest.requireActual('@/lib/ai/verify');
    return {
        ...actual,
        verifyAndExecute: (...args: Parameters<typeof mockVerifyAndExecute>) =>
            mockVerifyAndExecute(...args),
        supabaseVerifyDb: jest.fn(() => ({})),
    };
});

const mockDraftSignalResponse = jest.fn(
    async (_signal: unknown, _deps: unknown) => ({
        status: 'draft' as const,
        actionId: 'action-1',
    }),
);
const mockDraftOnboarding = jest.fn(
    async (_input: unknown, _deps: unknown) => ({
        status: 'draft' as const,
        actionId: 'action-1',
    }),
);

jest.mock('@/lib/ai/agents/community-manager', () => ({
    draftSignalResponse: (signal: unknown, deps: unknown) =>
        mockDraftSignalResponse(signal, deps),
    draftOnboarding: (input: unknown, deps: unknown) => mockDraftOnboarding(input, deps),
}));

describe('dispatchSignal', () => {
    beforeEach(() => {
        mockQstashState.publishCalls = [];
    });

    test('persists the signal and skips QStash delivery when not configured (dev mode)', async () => {
        process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
        process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';
        const db = fakeDb();

        await dispatchSignal(NEW_POST, { db });

        expect(db.rows.size).toBe(1);
        expect(mockQstashState.publishCalls).toHaveLength(0);
    });

    test('publishes { signalId } to the worker URL when QStash is configured', async () => {
        process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
        process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';
        process.env.QSTASH_TOKEN = 'qstash-token';
        process.env.NEXT_PUBLIC_SITE_URL = 'https://app.example.com';
        const db = fakeDb();

        await dispatchSignal(NEW_POST, { db });

        expect(db.rows.size).toBe(1);
        expect(mockQstashState.publishCalls).toHaveLength(1);
        const call = mockQstashState.publishCalls[0];
        expect(call.url).toBe('https://app.example.com/api/queues/ai-signals');
        const onlyRow = [...db.rows.values()][0];
        expect(call.body).toEqual({ signalId: onlyRow.id });
    });

    test('deduped signals are persisted but never delivered', async () => {
        process.env.QSTASH_TOKEN = 'qstash-token';
        process.env.NEXT_PUBLIC_SITE_URL = 'https://app.example.com';
        const db = fakeDb();

        await dispatchSignal(NEW_POST, { db });
        await dispatchSignal(NEW_POST, { db });

        expect(db.rows.size).toBe(1);
        expect(mockQstashState.publishCalls).toHaveLength(1);
    });

    test('never throws when Supabase env is missing (dev without DB)', async () => {
        delete process.env.NEXT_PUBLIC_SUPABASE_URL;
        delete process.env.SUPABASE_SERVICE_ROLE_KEY;

        await expect(dispatchSignal(NEW_POST)).resolves.toBeUndefined();
    });
});

// ---------------------------------------------------------------------------
// SIGNAL_ROUTING — completeness
// ---------------------------------------------------------------------------

function representativeSignal(type: string): AISignalRecord {
    const payloads: Record<string, Record<string, unknown>> = {
        new_post: { postId: 'post-1', authorId: 'user-1' },
        member_joined: { userId: 'user-2' },
        points_milestone: { userId: 'user-3', threshold: 100, totalPoints: 105 },
    };
    return {
        id: 'sig-1',
        type,
        clubId: 'club-1',
        payload: payloads[type],
        dedupKey: `${type}:test`,
        processedAt: null,
        createdAt: new Date().toISOString(),
    };
}

describe('SIGNAL_ROUTING', () => {
    // new_post / member_joined are agent-composed in the worker
    // (draftSignalResponse), not in this deterministic table.
    const EXPECTED_TYPES = ['points_milestone'];

    test('covers every v1 signal type', () => {
        for (const t of EXPECTED_TYPES) {
            expect(SIGNAL_ROUTING[t]).toBeDefined();
        }
    });

    test('every route points at a real agent and a real action', () => {
        for (const [type, route] of Object.entries(SIGNAL_ROUTING)) {
            expect(AGENTS[route.agentId]).toBeDefined();
            expect(ACTION_REGISTRY[route.action]).toBeDefined();
            // The agent must hold the action's required permissions,
            // otherwise verifyAndExecute would block every signal.
            const def = ACTION_REGISTRY[route.action];
            const agent = AGENTS[route.agentId];
            for (const p of def.permissions) {
                expect(agent.permissions).toContain(p);
            }
            expect(type).toBeTruthy();
        }
    });

    test('composed inputs satisfy the action input schema', () => {
        for (const [type, route] of Object.entries(SIGNAL_ROUTING)) {
            const signal = representativeSignal(type);
            const inputs = route.composeInputs(signal);
            const def = ACTION_REGISTRY[route.action];
            const parsed = def.inputSchema.safeParse(inputs);
            expect(parsed.success).toBe(true);
        }
    });

    test('all v1 routes target the community-manager (draft-only agent)', () => {
        for (const route of Object.values(SIGNAL_ROUTING)) {
            expect(route.agentId).toBe('community-manager');
        }
    });
});

// ---------------------------------------------------------------------------
// Worker route: POST /api/queues/ai-signals
// ---------------------------------------------------------------------------

function workerRequest(body: unknown): NextRequest {
    return new NextRequest('http://localhost/api/queues/ai-signals', {
        method: 'POST',
        body: JSON.stringify(body),
    });
}

function storedSignal(overrides?: Partial<AISignalRecord>): AISignalRecord {
    const s: AISignalRecord = {
        id: 'sig-1',
        type: 'new_post',
        clubId: 'club-1',
        payload: { postId: 'post-1', authorId: 'user-1' },
        dedupKey: 'new_post:post-1',
        processedAt: null,
        createdAt: new Date().toISOString(),
        ...overrides,
    };
    mockSignalStore.signals.set(s.id, s);
    return s;
}

describe('POST /api/queues/ai-signals', () => {
    beforeEach(() => {
        mockSignalStore.signals.clear();
        mockQstashState.signatureValid = true;
        mockQstashState.publishCalls = [];
        mockGetSignalById.mockClear();
        mockMarkSignalProcessed.mockClear();
        mockVerifyAndExecute.mockClear();
        mockDraftSignalResponse.mockClear();
        mockDraftOnboarding.mockClear();
        process.env.INTERNAL_WORKER_SECRET = 'test-secret';
        process.env.QSTASH_CURRENT_SIGNING_KEY = 'current';
        process.env.QSTASH_NEXT_SIGNING_KEY = 'next';
    });

    test('happy path (new_post): delegates to draftSignalResponse and marks the signal processed', async () => {
        const s = storedSignal();

        const res = await POST(workerRequest({ signalId: s.id }));

        expect(res.status).toBe(200);
        expect(mockDraftSignalResponse).toHaveBeenCalledTimes(1);
        expect(mockDraftSignalResponse).toHaveBeenCalledWith(
            {
                type: 'new_post',
                clubId: 'club-1',
                payload: { postId: 'post-1', authorId: 'user-1' },
                idempotencyKey: 'ai-signal:sig-1',
            },
            expect.anything(),
        );
        expect(mockVerifyAndExecute).not.toHaveBeenCalled();
        expect(mockMarkSignalProcessed).toHaveBeenCalledWith('sig-1', expect.anything());
        expect(mockSignalStore.signals.get('sig-1')?.processedAt).not.toBeNull();
    });

    test('member_joined: delegates to draftSignalResponse (which drafts onboarding)', async () => {
        const s = storedSignal({ type: 'member_joined', payload: { userId: 'user-2' } });

        const res = await POST(workerRequest({ signalId: s.id }));

        expect(res.status).toBe(200);
        expect(mockDraftSignalResponse).toHaveBeenCalledTimes(1);
        const signal = mockDraftSignalResponse.mock.calls[0][0] as { type: string };
        expect(signal.type).toBe('member_joined');
        expect(mockMarkSignalProcessed).toHaveBeenCalledWith('sig-1', expect.anything());
    });

    test('points_milestone: falls back to the deterministic SIGNAL_ROUTING path', async () => {
        const s = storedSignal({
            type: 'points_milestone',
            payload: { userId: 'user-3', threshold: 100 },
        });

        const res = await POST(workerRequest({ signalId: s.id }));

        expect(res.status).toBe(200);
        expect(mockDraftSignalResponse).not.toHaveBeenCalled();
        expect(mockVerifyAndExecute).toHaveBeenCalledTimes(1);
        const req = mockVerifyAndExecute.mock.calls[0][0];
        expect(req.agentDef.id).toBe('community-manager');
        expect(req.action).toBe('send_message');
        expect(req.ctx.clubId).toBe('club-1');
        expect(req.ctx.idempotencyKey).toBe('ai-signal:sig-1');
        expect(mockMarkSignalProcessed).toHaveBeenCalledWith('sig-1', expect.anything());
    });

    test('unknown signal type: marked processed, agent not run, 200', async () => {
        const s = storedSignal({ type: 'time_travel' });

        const res = await POST(workerRequest({ signalId: s.id }));

        expect(res.status).toBe(200);
        expect(mockVerifyAndExecute).not.toHaveBeenCalled();
        expect(mockMarkSignalProcessed).toHaveBeenCalledWith('sig-1', expect.anything());
    });

    test('already-processed signal: 200, agent not run, not marked again', async () => {
        const s = storedSignal({ processedAt: new Date().toISOString() });

        const res = await POST(workerRequest({ signalId: s.id }));

        expect(res.status).toBe(200);
        expect(mockVerifyAndExecute).not.toHaveBeenCalled();
        expect(mockMarkSignalProcessed).not.toHaveBeenCalled();
    });

    test('unknown signalId: 200, agent not run', async () => {
        const res = await POST(workerRequest({ signalId: 'nope' }));

        expect(res.status).toBe(200);
        expect(mockVerifyAndExecute).not.toHaveBeenCalled();
        expect(mockMarkSignalProcessed).not.toHaveBeenCalled();
    });

    test('malformed payload (no signalId): 200, agent not run', async () => {
        const res = await POST(workerRequest({ nope: 1 }));

        expect(res.status).toBe(200);
        expect(mockVerifyAndExecute).not.toHaveBeenCalled();
    });

    test('invalid QStash signature: 401, agent not run', async () => {
        mockQstashState.signatureValid = false;
        storedSignal();

        const res = await POST(workerRequest({ signalId: 'sig-1' }));

        expect(res.status).toBe(401);
        expect(mockVerifyAndExecute).not.toHaveBeenCalled();
        expect(mockMarkSignalProcessed).not.toHaveBeenCalled();
    });

    test('missing internal worker secret: 401, agent not run', async () => {
        delete process.env.INTERNAL_WORKER_SECRET;
        storedSignal();

        const res = await POST(workerRequest({ signalId: 'sig-1' }));

        expect(res.status).toBe(401);
        expect(mockVerifyAndExecute).not.toHaveBeenCalled();
    });

    test('agent pipeline failure: 500 so QStash retries', async () => {
        mockDraftSignalResponse.mockRejectedValueOnce(new Error('model down'));
        const s = storedSignal();

        const res = await POST(workerRequest({ signalId: s.id }));

        expect(res.status).toBe(500);
        // Not marked processed: the retry re-runs draftSignalResponse, which
        // is idempotent via the ai-signal:<id> idempotency key.
        expect(mockMarkSignalProcessed).not.toHaveBeenCalled();
    });
});
