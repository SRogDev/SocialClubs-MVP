/**
 * GET /api/clubs/[id]/leaderboard?limit=10
 *
 * Club leaderboard for the LeaderboardWidget renderer. Reuses the existing
 * getClubLeaderboard service (gamification points, ranked).
 *
 * Auth: logged in + any club role (leaderboards are member-visible).
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { AuthorizationError, requireClubRole } from '@/lib/authz';
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit';
import { createClient } from '@/lib/supabase/server';
import { getClubLeaderboard } from '@/services/gamificationService';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    try {
        const rateLimitResult = await rateLimit(request, RATE_LIMITS.QUERY);
        if (rateLimitResult) return rateLimitResult;

        const supabase = await createClient();
        const {
            data: { user },
            error: authError,
        } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json(
                { error: 'Unauthorized', message: 'You must be logged in' },
                { status: 401 },
            );
        }

        const { id } = await params;
        if (!id) {
            return NextResponse.json(
                { error: 'Bad request', message: 'Club ID is required' },
                { status: 400 },
            );
        }

        await requireClubRole(user.id, id, ['owner', 'admin', 'moderator', 'member']);

        const { searchParams } = new URL(request.url);
        const rawLimit = Number.parseInt(searchParams.get('limit') ?? '10', 10);
        const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(rawLimit, 1), 25) : 10;

        const entries = await getClubLeaderboard(id, limit);
        return NextResponse.json({ data: entries });
    } catch (error) {
        if (error instanceof AuthorizationError) {
            const status = error.code === 'NOT_A_MEMBER' ? 404 : 403;
            return NextResponse.json(
                { error: 'Forbidden', message: 'You need to be a member of this club' },
                { status },
            );
        }
        console.error('Error in GET /api/clubs/[id]/leaderboard:', error);
        return NextResponse.json(
            { error: 'Internal server error', message: 'Failed to load leaderboard' },
            { status: 500 },
        );
    }
}
