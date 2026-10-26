/**
 * GET /api/games/[id]/leaderboard?eventId=<uuid>
 *
 * Best-score ranking for a game (club scope, or event scope when eventId
 * is given). Club members only.
 */
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { AuthorizationError, requireClubRole, CLUB_ROLES } from '@/lib/authz';
import { defaultGameService } from '@/lib/games/service';
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit';

import { gamesDisabledResponse, requireUser } from '../../shared';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    const disabled = gamesDisabledResponse();
    if (disabled) return disabled;
    try {
        const limited = await rateLimit(request, RATE_LIMITS.READ);
        if (limited) return limited;

        const { user, response } = await requireUser();
        if (!user) return response;

        const { id } = await params;
        const service = defaultGameService();
        const game = await service.getGame(id);
        if (!game) {
            return NextResponse.json({ error: 'Juego no encontrado' }, { status: 404 });
        }
        await requireClubRole(user.id, game.clubId, [...CLUB_ROLES]);

        const eventIdParam = request.nextUrl.searchParams.get('eventId');
        const entries = await service.leaderboard(id, eventIdParam || null);
        return NextResponse.json({ success: true, entries });
    } catch (err) {
        if (err instanceof AuthorizationError) {
            return NextResponse.json({ error: 'Sin permiso para este club' }, { status: 403 });
        }
        console.error('[api/games/[id]/leaderboard]', err);
        return NextResponse.json(
            { error: 'No se pudo cargar la clasificación.' },
            { status: 500 },
        );
    }
}
