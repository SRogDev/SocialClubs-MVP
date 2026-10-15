/**
 * Service-level authorization guards.
 *
 * Club-role checks used to live only in `proxy.ts` and inline in routes/
 * server actions. Any direct service caller (AI workers via QStash,
 * cron jobs, future MCP tools) would bypass those checks entirely.
 *
 * These guards run INSIDE the service functions, so every caller —
 * route, action, or worker — is authorized the same way:
 *
 *   await requireClubRole(actorId, clubId, ['owner', 'admin'])
 *
 * Design notes:
 * - Global admins (`users.role = 'admin'`) bypass club-role checks so
 *   admin routes that call services directly keep working.
 * - The club creator is treated as `owner` even without a `users_clubs`
 *   row (`createClub` does not insert one today).
 * - Fail CLOSED: any DB error during the membership lookup denies access.
 *   (Failing open here would let outages grant privileges.)
 */

import { timingSafeEqual } from 'node:crypto';

import { createClient } from '@/lib/supabase/server';

export const CLUB_ROLES = ['owner', 'admin', 'moderator', 'member'] as const;
export type ClubRole = (typeof CLUB_ROLES)[number];

export type AuthorizationErrorCode =
    | 'FORBIDDEN'
    | 'NOT_A_MEMBER'
    | 'UNAUTHENTICATED';

export class AuthorizationError extends Error {
    readonly code: AuthorizationErrorCode;

    constructor(message: string, code: AuthorizationErrorCode) {
        super(message);
        this.name = 'AuthorizationError';
        this.code = code;
    }
}

/**
 * True when `userId` is a global admin (`users.role = 'admin'`).
 * DB errors resolve to false (fail closed).
 */
export async function isGlobalAdmin(userId: string): Promise<boolean> {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from('users')
        .select('role')
        .eq('id', userId)
        .maybeSingle();

    if (error) return false;
    return data?.role === 'admin';
}

/**
 * Throws unless `userId` is a global admin.
 */
export async function requireGlobalAdmin(userId: string): Promise<void> {
    if (!(await isGlobalAdmin(userId))) {
        throw new AuthorizationError(
            'Requires global admin privileges',
            'FORBIDDEN'
        );
    }
}

/**
 * Requires `userId` to hold one of `allowedRoles` in `clubId`.
 *
 * - Global admins bypass the club-role check (admin routes call
 *   services directly).
 * - The club creator counts as `owner` even without a `users_clubs` row.
 * - Throws `AuthorizationError` with code `NOT_A_MEMBER` when the user
 *   has no membership, `FORBIDDEN` when their role is insufficient or
 *   the membership cannot be verified (fail closed).
 *
 * Returns the resolved role so callers can branch on it if needed.
 */
export async function requireClubRole(
    userId: string,
    clubId: string,
    allowedRoles: string[]
): Promise<ClubRole> {
    const supabase = await createClient();

    // 1. Global admin bypass — admin tooling calls services directly.
    const { data: userRow } = await supabase
        .from('users')
        .select('role')
        .eq('id', userId)
        .maybeSingle();

    if (userRow?.role === 'admin') {
        return 'admin';
    }

    // 2. Club membership.
    const { data: membership, error: membershipError } = await supabase
        .from('users_clubs')
        .select('role')
        .eq('user_id', userId)
        .eq('club_id', clubId)
        .maybeSingle();

    if (membershipError) {
        // Fail closed: we cannot verify the role, so deny.
        throw new AuthorizationError(
            'Could not verify club membership',
            'FORBIDDEN'
        );
    }

    if (!membership) {
        // The creator is the implicit owner, even without a membership row.
        const { data: club } = await supabase
            .from('clubs')
            .select('creator')
            .eq('id', clubId)
            .maybeSingle();

        if (club?.creator === userId) {
            if (!allowedRoles.includes('owner')) {
                throw new AuthorizationError(
                    `Requires club role: ${allowedRoles.join(', ')}`,
                    'FORBIDDEN'
                );
            }
            return 'owner';
        }

        throw new AuthorizationError('Not a member of this club', 'NOT_A_MEMBER');
    }

    if (!allowedRoles.includes(membership.role)) {
        throw new AuthorizationError(
            `Requires club role: ${allowedRoles.join(', ')} (has: ${membership.role})`,
            'FORBIDDEN'
        );
    }

    return membership.role as ClubRole;
}

/**
 * Authorizes a post-level action: the author may act on their own post,
 * otherwise the actor needs a staff club role (owner/admin/moderator).
 *
 * `authorId` comes from the post's `content->>user_id` payload — the
 * `posts` table has no `user_id` column.
 */
export async function requirePostAccess(
    actorId: string,
    clubId: string,
    authorId: string | null
): Promise<void> {
    if (authorId && authorId === actorId) return;
    await requireClubRole(actorId, clubId, ['owner', 'admin', 'moderator']);
}

/**
 * Verifies an internal worker secret against INTERNAL_WORKER_SECRET
 * using a constant-time comparison. Used by system-only service
 * functions (e.g. gamification awards) that must not be callable by
 * end users, even through a compromised route.
 */
export function verifyInternalSecret(
    provided: string | undefined | null
): boolean {
    const expected = process.env.INTERNAL_WORKER_SECRET;
    if (!expected || !provided) return false;
    const a = Buffer.from(provided, 'utf8');
    const b = Buffer.from(expected, 'utf8');
    return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Throws unless `secret` matches INTERNAL_WORKER_SECRET.
 */
export function requireInternalWorker(secret: string | undefined | null): void {
    if (!verifyInternalSecret(secret)) {
        throw new AuthorizationError(
            'Invalid or missing internal worker secret',
            'FORBIDDEN'
        );
    }
}
