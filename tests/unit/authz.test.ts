/**
 * Service-level authorization guards — unit tests (RED → GREEN).
 *
 * The Supabase server client is fully mocked: no network, no cookies.
 * These tests pin the security contract that AI workers (QStash routes)
 * and any direct service caller must satisfy.
 */

import {
    AuthorizationError,
    requireClubRole,
    requireGlobalAdmin,
    requireInternalWorker,
} from '@/lib/authz';
import { createClient } from '@/lib/supabase/server';

jest.mock('@/lib/supabase/server', () => ({
    createClient: jest.fn(),
}));

const mockCreateClient = createClient as jest.Mock;

interface QueryResult {
    data: unknown;
    error: unknown;
}

/** Builds a supabase client whose .from(table) resolves per-table results. */
function mockClient(results: Record<string, QueryResult>) {
    const chainFor = (table: string) => {
        const result: QueryResult = results[table] ?? { data: null, error: null };
        const chain: Record<string, jest.Mock> = {};
        chain.select = jest.fn(() => chain);
        chain.eq = jest.fn(() => chain);
        chain.maybeSingle = jest.fn(async () => result);
        chain.single = jest.fn(async () => result);
        return chain;
    };
    return { from: jest.fn((table: string) => chainFor(table)) };
}

function seed(results: Record<string, QueryResult>) {
    mockCreateClient.mockResolvedValue(mockClient(results));
}

const MEMBER_ROW = { data: { role: 'member' }, error: null };
const NOTHING: QueryResult = { data: null, error: null };

beforeEach(() => {
    jest.clearAllMocks();
});

describe('AuthorizationError', () => {
    it('carries a machine-readable code', () => {
        const err = new AuthorizationError('nope', 'FORBIDDEN');
        expect(err).toBeInstanceOf(Error);
        expect(err.code).toBe('FORBIDDEN');
        expect(err.name).toBe('AuthorizationError');
    });
});

describe('requireClubRole', () => {
    it('blocks a member from an owner/admin action (FORBIDDEN)', async () => {
        seed({ users: MEMBER_ROW, users_clubs: { data: { role: 'member' }, error: null } });

        await expect(
            requireClubRole('user-1', 'club-1', ['owner', 'admin'])
        ).rejects.toMatchObject({ code: 'FORBIDDEN' });
    });

    it('blocks a non-member entirely (NOT_A_MEMBER)', async () => {
        seed({
            users: MEMBER_ROW,
            users_clubs: NOTHING,
            clubs: { data: { creator: 'someone-else' }, error: null },
        });

        await expect(
            requireClubRole('user-1', 'club-1', ['owner', 'admin', 'moderator', 'member'])
        ).rejects.toMatchObject({ code: 'NOT_A_MEMBER' });
    });

    it('allows a moderator where moderators are permitted', async () => {
        seed({
            users: MEMBER_ROW,
            users_clubs: { data: { role: 'moderator' }, error: null },
        });

        await expect(
            requireClubRole('user-1', 'club-1', ['owner', 'admin', 'moderator'])
        ).resolves.toBe('moderator');
    });

    it('allows an owner to run owner actions', async () => {
        seed({
            users: MEMBER_ROW,
            users_clubs: { data: { role: 'owner' }, error: null },
        });

        await expect(requireClubRole('user-1', 'club-1', ['owner'])).resolves.toBe(
            'owner'
        );
    });

    it('allows a plain member for member-level actions (createPost)', async () => {
        seed({
            users: MEMBER_ROW,
            users_clubs: { data: { role: 'member' }, error: null },
        });

        await expect(
            requireClubRole('user-1', 'club-1', ['owner', 'admin', 'moderator', 'member'])
        ).resolves.toBe('member');
    });

    it('lets a global admin bypass club roles entirely', async () => {
        seed({
            users: { data: { role: 'admin' }, error: null },
            users_clubs: NOTHING, // no membership at all — must still pass
        });

        await expect(
            requireClubRole('admin-1', 'club-1', ['owner'])
        ).resolves.toBe('admin');
    });

    it('treats the club creator as owner even without a membership row', async () => {
        seed({
            users: MEMBER_ROW,
            users_clubs: NOTHING,
            clubs: { data: { creator: 'user-1' }, error: null },
        });

        await expect(requireClubRole('user-1', 'club-1', ['owner'])).resolves.toBe(
            'owner'
        );
    });

    it('fails closed when the membership check errors', async () => {
        seed({
            users: MEMBER_ROW,
            users_clubs: { data: null, error: { message: 'boom', code: 'XX000' } },
        });

        await expect(
            requireClubRole('user-1', 'club-1', ['owner', 'admin', 'moderator', 'member'])
        ).rejects.toMatchObject({ code: 'FORBIDDEN' });
    });
});

describe('requireGlobalAdmin', () => {
    it('passes for a global admin', async () => {
        seed({ users: { data: { role: 'admin' }, error: null } });

        await expect(requireGlobalAdmin('admin-1')).resolves.toBeUndefined();
    });

    it('rejects a non-admin with FORBIDDEN', async () => {
        seed({ users: MEMBER_ROW });

        await expect(requireGlobalAdmin('user-1')).rejects.toMatchObject({
            code: 'FORBIDDEN',
        });
    });
});

describe('requireInternalWorker', () => {
    const REAL_ENV = process.env.INTERNAL_WORKER_SECRET;

    beforeEach(() => {
        process.env.INTERNAL_WORKER_SECRET = 'test-worker-secret';
    });

    afterAll(() => {
        process.env.INTERNAL_WORKER_SECRET = REAL_ENV;
    });

    it('passes with the correct secret', () => {
        expect(() => requireInternalWorker('test-worker-secret')).not.toThrow();
    });

    it('rejects a wrong secret', () => {
        expect(() => requireInternalWorker('wrong')).toThrow(AuthorizationError);
        expect(() => requireInternalWorker('wrong')).toThrow(
            expect.objectContaining({ code: 'FORBIDDEN' })
        );
    });

    it('rejects a missing secret', () => {
        expect(() => requireInternalWorker(undefined)).toThrow(AuthorizationError);
    });

    it('rejects when INTERNAL_WORKER_SECRET is not configured', () => {
        delete process.env.INTERNAL_WORKER_SECRET;
        expect(() => requireInternalWorker('test-worker-secret')).toThrow(
            AuthorizationError
        );
    });
});
