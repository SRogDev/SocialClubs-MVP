/**
 * Games API route tests: HTTP surface + authorization for /api/games/*.
 *
 * - Flag off → 404 on every route.
 * - Unauthenticated → 401 { error: 'No autorizado' }.
 * - POST generate: staff only; a validation-failed generation is still
 *   stored as a draft and returned 201 WITH its validation report.
 * - GET list: members are forced to status=published; staff may filter.
 * - GET [id]: members get 404 for drafts.
 * - POST session: preview requires staff; play returns session-bound HTML.
 * - POST bridge: session must belong to this game AND the caller (403).
 *
 * Auth, rate limiting, the game service and the generator are mocked —
 * what is tested is the route wiring. Engine semantics live in
 * service.test.ts / e2e.test.ts.
 */
import { NextRequest } from 'next/server';

import { POST as generatePOST } from '@/app/api/games/generate/route';
import { GET as listGET } from '@/app/api/games/route';
import { GET as detailGET } from '@/app/api/games/[id]/route';
import { POST as bridgePOST } from '@/app/api/games/[id]/bridge/route';
import { POST as sessionPOST } from '@/app/api/games/[id]/session/route';
import { AuthorizationError } from '@/lib/authz';

jest.mock('@/lib/supabase/server', () => ({ createClient: jest.fn() }));
jest.mock('@/lib/rate-limit', () => ({
    rateLimit: jest.fn(async () => null),
    RATE_LIMITS: { READ: {}, MUTATION: {}, QUERY: {} },
}));
jest.mock('next/server', () => {
    class StubNextRequest {
        url: string;
        method: string;
        nextUrl: URL;
        private bodyText: string | null;
        constructor(url: string, init?: { method?: string; body?: string }) {
            this.url = typeof url === 'string' ? url : String(url);
            this.nextUrl = new URL(this.url);
            this.method = init?.method ?? 'GET';
            this.bodyText = init?.body ?? null;
        }
        async json(): Promise<unknown> {
            if (this.bodyText === null) throw new Error('no body');
            return JSON.parse(this.bodyText) as unknown;
        }
    }
    class StubNextResponse {
        readonly status: number;
        private readonly body: unknown;
        constructor(body: unknown, init?: { status?: number }) {
            this.body = body;
            this.status = init?.status ?? 200;
        }
        async json(): Promise<unknown> {
            return this.body;
        }
        static json(body: unknown, init?: { status?: number }) {
            return new StubNextResponse(body, init);
        }
    }
    return { NextRequest: StubNextRequest, NextResponse: StubNextResponse };
});
jest.mock('@/lib/authz', () => {
    const actual = jest.requireActual('@/lib/authz');
    return { ...actual, requireClubRole: jest.fn() };
});
jest.mock('@/lib/games/service', () => ({ defaultGameService: jest.fn() }));
jest.mock('@/lib/games/generate', () => ({ generateGame: jest.fn() }));

import { createClient } from '@/lib/supabase/server';
import { requireClubRole } from '@/lib/authz';
import { generateGame } from '@/lib/games/generate';
import { defaultGameService } from '@/lib/games/service';

const mockCreateClient = createClient as jest.Mock;
const mockRequireClubRole = requireClubRole as jest.Mock;
const mockGenerate = generateGame as jest.Mock;
const mockDefaultService = defaultGameService as jest.Mock;

const CLUB_ID = '11111111-1111-4111-8111-111111111111';
const GAME_ID = '22222222-2222-4222-8222-222222222222';

const brief = {
    title: 'Quiz del club',
    description: 'Un quiz corto sobre el club',
    gameType: 'quiz',
    mechanics: 'Responde preguntas de opción múltiple',
    players: 'async',
    scoringIntent: 'Puntos por acierto',
    maxScore: 100,
    pointsPerSession: 10,
    sessionMinutes: 5,
    capabilities: ['leaderboard'],
};

function gameRow(overrides: Record<string, unknown> = {}) {
    return {
        id: GAME_ID,
        clubId: CLUB_ID,
        eventId: null,
        postId: null,
        createdBy: 'user-1',
        createdByAgent: null,
        title: 'Quiz del club',
        prompt: 'Un quiz sobre el club',
        brief,
        html: '<html><body>game</body></html>',
        capabilities: ['leaderboard'],
        status: 'draft',
        validation: { ok: true, violations: [], usedCapabilities: [], sizeBytes: 10 },
        mock: false,
        createdAt: '2026-10-23T00:00:00.000Z',
        updatedAt: '2026-10-23T00:00:00.000Z',
        ...overrides,
    };
}

function mockUser(userId: string | null) {
    mockCreateClient.mockResolvedValue({
        auth: {
            getUser: async () =>
                userId
                    ? { data: { user: { id: userId } }, error: null }
                    : { data: { user: null }, error: new Error('no session') },
        },
    });
}

function mockService(overrides: Record<string, jest.Mock> = {}) {
    const svc = {
        createDraft: jest.fn(async (input: Record<string, unknown>) =>
            gameRow({ brief: input.brief, validation: input.validation, mock: input.mock }),
        ),
        reviewGame: jest.fn(async () => gameRow({ status: 'published' })),
        attachGame: jest.fn(async () => gameRow({ status: 'published' })),
        listLibrary: jest.fn(async () => [gameRow({ status: 'published' })]),
        getGame: jest.fn(async () => gameRow()),
        getSession: jest.fn(async () => ({
            id: 'sess-1',
            gameId: GAME_ID,
            clubId: CLUB_ID,
            userId: 'user-1',
            eventId: null,
            kind: 'play',
            startedAt: new Date().toISOString(),
            submissions: 0,
            awardsUsed: 0,
            pointsAwarded: 0,
        })),
        startSession: jest.fn(async () => ({
            session: { id: 'sess-1' },
            game: gameRow({ status: 'published' }),
        })),
        handleBridgeCall: jest.fn(async () => ({ ok: true, result: { member: true } })),
        leaderboard: jest.fn(async () => []),
        listUnlocks: jest.fn(async () => []),
        ...overrides,
    };
    mockDefaultService.mockReturnValue(svc);
    return svc;
}

const postJson = (url: string, body: unknown) =>
    new NextRequest(url, { method: 'POST', body: JSON.stringify(body) });
const idParams = { params: Promise.resolve({ id: GAME_ID }) };

beforeEach(() => {
    jest.clearAllMocks();
    process.env.AI_MINIGAME_RUNTIME = '1';
    mockUser('user-1');
    mockRequireClubRole.mockResolvedValue('owner');
    mockService();
});

afterEach(() => {
    delete process.env.AI_MINIGAME_RUNTIME;
});

describe('POST /api/games/generate', () => {
    it('returns 404 when the flag is off', async () => {
        delete process.env.AI_MINIGAME_RUNTIME;
        const res = await generatePOST(
            postJson('http://localhost/api/games/generate', { clubId: CLUB_ID, prompt: 'Un quiz divertido' }),
        );
        expect(res.status).toBe(404);
    });

    it('returns 401 when unauthenticated', async () => {
        mockUser(null);
        const res = await generatePOST(
            postJson('http://localhost/api/games/generate', { clubId: CLUB_ID, prompt: 'Un quiz divertido' }),
        );
        const body = await res.json();
        expect(res.status).toBe(401);
        expect(body.error).toBe('No autorizado');
    });

    it('returns 400 for a too-short prompt', async () => {
        const res = await generatePOST(
            postJson('http://localhost/api/games/generate', { clubId: CLUB_ID, prompt: 'corto' }),
        );
        expect(res.status).toBe(400);
    });

    it('stores and returns 201 even when validation failed', async () => {
        const svc = mockService();
        mockGenerate.mockResolvedValue({
            brief,
            html: '<html></html>',
            validation: { ok: false, violations: [{ rule: 'no_network', detail: 'fetch' }], usedCapabilities: [], sizeBytes: 5 },
            mock: true,
            attempts: 2,
            contentUsed: false,
        });
        const res = await generatePOST(
            postJson('http://localhost/api/games/generate', { clubId: CLUB_ID, prompt: 'Un quiz divertido' }),
        );
        const body = await res.json();
        expect(res.status).toBe(201);
        expect(body.success).toBe(true);
        expect(body.game.validation.ok).toBe(false);
        expect(body.game.html).toBeUndefined();
        expect(svc.createDraft).toHaveBeenCalled();
    });
});

describe('GET /api/games (list)', () => {
    it('forces published for non-staff members', async () => {
        const svc = mockService();
        mockRequireClubRole
            .mockRejectedValueOnce(new AuthorizationError('denied', 'FORBIDDEN'))
            .mockResolvedValue('member');
        const res = await listGET(
            new NextRequest(`http://localhost/api/games?clubId=${CLUB_ID}&status=draft`),
        );
        const body = await res.json();
        expect(res.status).toBe(200);
        expect(svc.listLibrary).toHaveBeenCalledWith(CLUB_ID, 'published');
        expect(body.games[0].html).toBeUndefined();
    });

    it('lets staff filter by status', async () => {
        const svc = mockService();
        const res = await listGET(
            new NextRequest(`http://localhost/api/games?clubId=${CLUB_ID}&status=draft`),
        );
        expect(res.status).toBe(200);
        expect(svc.listLibrary).toHaveBeenCalledWith(CLUB_ID, 'draft');
    });
});

describe('GET /api/games/[id]', () => {
    it('returns 404 for a draft requested by a plain member', async () => {
        mockRequireClubRole
            .mockRejectedValueOnce(new AuthorizationError('denied', 'FORBIDDEN'))
            .mockResolvedValue('member');
        const res = await detailGET(
            new NextRequest(`http://localhost/api/games/${GAME_ID}`),
            idParams,
        );
        expect(res.status).toBe(404);
    });
});

describe('POST /api/games/[id]/session', () => {
    it('requires staff for preview', async () => {
        mockRequireClubRole.mockRejectedValue(new AuthorizationError('denied', 'FORBIDDEN'));
        const res = await sessionPOST(
            postJson(`http://localhost/api/games/${GAME_ID}/session`, { kind: 'preview' }),
            idParams,
        );
        expect(res.status).toBe(403);
    });

    it('returns session-bound playable html for play', async () => {
        const res = await sessionPOST(
            postJson(`http://localhost/api/games/${GAME_ID}/session`, { kind: 'play' }),
            idParams,
        );
        const body = await res.json();
        expect(res.status).toBe(200);
        expect(body.sessionId).toBe('sess-1');
        expect(body.html).toContain('SC_GAME_BRIDGE');
    });
});

describe('POST /api/games/[id]/bridge', () => {
    it('rejects a session owned by another user', async () => {
        mockService({
            getSession: jest.fn(async () => ({
                id: 'sess-1',
                gameId: GAME_ID,
                clubId: CLUB_ID,
                userId: 'someone-else',
                eventId: null,
                kind: 'play',
                startedAt: new Date().toISOString(),
                submissions: 0,
                awardsUsed: 0,
                pointsAwarded: 0,
            })),
        });
        const res = await bridgePOST(
            postJson(`http://localhost/api/games/${GAME_ID}/bridge`, {
                sessionId: 'sess-1',
                method: 'member',
                params: {},
            }),
            idParams,
        );
        expect(res.status).toBe(403);
    });

    it('dispatches and returns the BridgeCallResult with HTTP 200', async () => {
        const res = await bridgePOST(
            postJson(`http://localhost/api/games/${GAME_ID}/bridge`, {
                sessionId: 'sess-1',
                method: 'member',
                params: {},
            }),
            idParams,
        );
        const body = await res.json();
        expect(res.status).toBe(200);
        expect(body.ok).toBe(true);
    });
});
