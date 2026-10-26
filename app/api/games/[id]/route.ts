/**
 * GET /api/games/[id]
 *
 * One game's summary + brief + validation (never the HTML). Visible to
 * members of the game's club: staff see any status; plain members only
 * published games (anything else reads as 404, so drafts don't leak).
 */
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { AuthorizationError, requireClubRole, CLUB_ROLES } from '@/lib/authz';
import { defaultGameService } from '@/lib/games/service';
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit';

import { gameSummary, gamesDisabledResponse, requireUser } from '../shared';

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

        let isStaff = false;
        try {
            await requireClubRole(user.id, game.clubId, ['owner', 'admin']);
            isStaff = true;
        } catch (err) {
            if (!(err instanceof AuthorizationError)) throw err;
        }
        if (!isStaff) {
            await requireClubRole(user.id, game.clubId, [...CLUB_ROLES]);
            if (game.status !== 'published') {
                return NextResponse.json({ error: 'Juego no encontrado' }, { status: 404 });
            }
        }

        return NextResponse.json({ success: true, game: gameSummary(game) });
    } catch (err) {
        if (err instanceof AuthorizationError) {
            return NextResponse.json({ error: 'Sin permiso para este club' }, { status: 403 });
        }
        console.error('[api/games/[id]] GET', err);
        return NextResponse.json(
            { error: 'No se pudo cargar el juego.' },
            { status: 500 },
        );
    }
}
