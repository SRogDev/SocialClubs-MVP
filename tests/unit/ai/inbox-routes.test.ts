/**
 * AI Inbox API route tests: HTTP surface + authorization.
 *
 * - GET /api/ai/inbox: 401 unauthenticated · 400 missing clubId ·
 *   403 FORBIDDEN for non-staff · 200 with actions for staff ·
 *   countOnly for the sidebar badge · 404 when the AI_INBOX flag is off.
 * - POST /api/ai/inbox/[actionId]: 401 · 400 invalid body · 403 FORBIDDEN
 *   for moderators (only owner/admin decide) · 404 unknown action ·
 *   200 approve delegates to approveAction · 200 reject delegates to
 *   rejectAction.
 *
 * Auth layers, rate limiting and the inbox lib are mocked — what is tested
 * is the route wiring. Decision semantics live in `inbox.test.ts`.
 */
import { NextRequest } from 'next/server';

import { GET } from '@/app/api/ai/inbox/route';
import { POST } from '@/app/api/ai/inbox/[actionId]/route';
import { AuthorizationError } from '@/lib/authz';

jest.mock('@/lib/supabase/server', () => ({ createClient: jest.fn() }));
jest.mock('@/lib/rate-limit', () => ({
    rateLimit: jest.fn(async () => null),
    RATE_LIMITS: { QUERY: {}, MUTATION: {} },
}));
// next/server needs fetch globals absent in jsdom; the routes only use
// `new NextRequest(url, init)`, `request.url`, `request.json()` and
// `NextResponse.json(body, init)` — faithfully stubbed here.
jest.mock('next/server', () => {
    class StubNextRequest {
        url: string;
        method: string;
        private bodyText: string | null;
        constructor(url: string, init?: { method?: string; body?: string }) {
            this.url = typeof url === 'string' ? url : String(url);
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
jest.mock('@/lib/ai/inbox', () => ({
    supabaseInboxDb: jest.fn(() => ({ __db: true })),
    listInboxActions: jest.fn(),
    countPendingActions: jest.fn(),
    getInboxAction: jest.fn(),
    approveAction: jest.fn(),
    rejectAction: jest.fn(),
    PENDING_STATUSES: ['pending_approval', 'draft'],
}));

// Imports AFTER jest.mock (hoisted) so the typed references resolve.
import { createClient } from '@/lib/supabase/server';
import { requireClubRole } from '@/lib/authz';
import * as inboxLib from '@/lib/ai/inbox';

const mockCreateClient = createClient as jest.Mock;
const mockRequireClubRole = requireClubRole as jest.Mock;
const mockList = inboxLib.listInboxActions as jest.Mock;
const mockCount = inboxLib.countPendingActions as jest.Mock;
const mockGet = inboxLib.getInboxAction as jest.Mock;
const mockApprove = inboxLib.approveAction as jest.Mock;
const mockReject = inboxLib.rejectAction as jest.Mock;

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

const getUrl = (qs = '') => `http://localhost/api/ai/inbox${qs}`;
const postUrl = (actionId: string) =>
    `http://localhost/api/ai/inbox/${actionId}`;
const postParams = (actionId: string) => ({
    params: Promise.resolve({ actionId }),
});

beforeEach(() => {
    jest.clearAllMocks();
    process.env.AI_INBOX = '1';
    mockUser('user-1');
    mockRequireClubRole.mockResolvedValue('owner');
});

afterEach(() => {
    delete process.env.AI_INBOX;
});

describe('GET /api/ai/inbox', () => {
    it('returns 401 when unauthenticated', async () => {
        mockUser(null);

        const res = await GET(new NextRequest(getUrl('?clubId=club-1')));

        expect(res.status).toBe(401);
    });

    it('returns 400 when clubId is missing', async () => {
        const res = await GET(new NextRequest(getUrl()));

        expect(res.status).toBe(400);
    });

    it('returns 403 FORBIDDEN for non-staff (authz code preserved)', async () => {
        mockRequireClubRole.mockRejectedValue(
            new AuthorizationError('denied', 'FORBIDDEN'),
        );

        const res = await GET(new NextRequest(getUrl('?clubId=club-1')));
        const body = await res.json();

        expect(res.status).toBe(403);
        expect(body.error).toBe('FORBIDDEN');
    });

    it('returns 200 with actions for staff, defaulting to pending statuses', async () => {
        mockList.mockResolvedValue([{ id: 'a1' }]);

        const res = await GET(new NextRequest(getUrl('?clubId=club-1')));
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body.data.actions).toEqual([{ id: 'a1' }]);
        expect(mockRequireClubRole).toHaveBeenCalledWith('user-1', 'club-1', [
            'owner',
            'admin',
            'moderator',
        ]);
        expect(mockList).toHaveBeenCalledWith(
            'club-1',
            expect.anything(),
            { statuses: ['pending_approval', 'draft'], humanDecision: undefined },
        );
    });

    it('supports explicit status + humanDecision filters', async () => {
        mockList.mockResolvedValue([]);

        await GET(
            new NextRequest(
                getUrl('?clubId=club-1&status=executed&humanDecision=approved'),
            ),
        );

        expect(mockList).toHaveBeenCalledWith(
            'club-1',
            expect.anything(),
            { statuses: ['executed'], humanDecision: 'approved' },
        );
    });

    it('countOnly returns the pending count for the sidebar badge', async () => {
        mockCount.mockResolvedValue(3);

        const res = await GET(
            new NextRequest(getUrl('?clubId=club-1&countOnly=1')),
        );
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body.data.count).toBe(3);
        expect(mockList).not.toHaveBeenCalled();
    });

    it('returns 404 when the AI_INBOX flag is off', async () => {
        delete process.env.AI_INBOX;

        const res = await GET(new NextRequest(getUrl('?clubId=club-1')));

        expect(res.status).toBe(404);
    });
});

describe('POST /api/ai/inbox/[actionId]', () => {
    const actionItem = {
        id: 'a1',
        clubId: 'club-1',
        agentId: 'community-manager',
        action: 'tag_post',
        inputs: {},
        status: 'pending_approval',
        reviews: [],
    };

    function postRequest(actionId: string, body: unknown) {
        return new NextRequest(postUrl(actionId), {
            method: 'POST',
            body: JSON.stringify(body),
        });
    }

    it('returns 401 when unauthenticated', async () => {
        mockUser(null);

        const res = await POST(
            postRequest('a1', { decision: 'approve' }),
            postParams('a1'),
        );

        expect(res.status).toBe(401);
    });

    it('returns 400 for an invalid decision', async () => {
        const res = await POST(
            postRequest('a1', { decision: 'maybe' }),
            postParams('a1'),
        );

        expect(res.status).toBe(400);
    });

    it('returns 403 FORBIDDEN for moderators — only owner/admin decide', async () => {
        mockRequireClubRole.mockRejectedValue(
            new AuthorizationError('denied', 'FORBIDDEN'),
        );
        mockGet.mockResolvedValue(actionItem);

        const res = await POST(
            postRequest('a1', { decision: 'approve' }),
            postParams('a1'),
        );
        const body = await res.json();

        expect(res.status).toBe(403);
        expect(body.error).toBe('FORBIDDEN');
        expect(mockRequireClubRole).toHaveBeenCalledWith('user-1', 'club-1', [
            'owner',
            'admin',
        ]);
        expect(mockApprove).not.toHaveBeenCalled();
    });

    it('returns 404 for an unknown action', async () => {
        mockGet.mockResolvedValue(null);

        const res = await POST(
            postRequest('missing', { decision: 'approve' }),
            postParams('missing'),
        );

        expect(res.status).toBe(404);
    });

    it('approve delegates to approveAction with reviewer + feedback', async () => {
        mockGet.mockResolvedValue(actionItem);
        mockApprove.mockResolvedValue({
            actionId: 'a1',
            status: 'executed',
            idempotent: false,
        });

        const res = await POST(
            postRequest('a1', { decision: 'approve', feedback: 'ok' }),
            postParams('a1'),
        );
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body.data.status).toBe('executed');
        expect(mockApprove).toHaveBeenCalledWith(
            'a1',
            'user-1',
            expect.anything(),
            'ok',
        );
        expect(mockReject).not.toHaveBeenCalled();
    });

    it('reject delegates to rejectAction and never approves', async () => {
        mockGet.mockResolvedValue(actionItem);
        mockReject.mockResolvedValue({
            actionId: 'a1',
            status: 'rejected',
            idempotent: false,
        });

        const res = await POST(
            postRequest('a1', { decision: 'reject', feedback: 'no' }),
            postParams('a1'),
        );
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body.data.status).toBe('rejected');
        expect(mockReject).toHaveBeenCalledWith(
            'a1',
            'user-1',
            expect.anything(),
            'no',
        );
        expect(mockApprove).not.toHaveBeenCalled();
    });

    it('returns 404 when the AI_INBOX flag is off', async () => {
        delete process.env.AI_INBOX;

        const res = await POST(
            postRequest('a1', { decision: 'approve' }),
            postParams('a1'),
        );

        expect(res.status).toBe(404);
    });
});
