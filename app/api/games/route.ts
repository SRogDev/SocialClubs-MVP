/**
 * GET /api/games?clubId=<uuid>&status=<draft|published|rejected|archived>
 *
 * Club library listing. Any club member may call it, but non-staff members
 * only ever see published games (their `status` param is ignored and
 * forced to 'published'). Staff (owner/admin) may filter by status.
 * Summaries never include the HTML artifact.
 */
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { AuthorizationError, requireClubRole, CLUB_ROLES } from '@/lib/authz';
import { defaultGameService, type GameStatus } from '@/lib/games/service';
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit';

import { gameSummary, gamesDisabledResponse, requireUser } from './shared';

const querySchema = z.object({
    clubId: z.string().uuid('clubId inválido'),
    status: z.enum(['draft', 'published', 'rejected', 'archived']).optional(),
});

export async function GET(request: NextRequest) {
    const disabled = gamesDisabledResponse();
    if (disabled) return disabled;
    try {
        const limited = await rateLimit(request, RATE_LIMITS.READ);
        if (limited) return limited;

        const { user, response } = await requireUser();
        if (!user) return response;

        const parsed = querySchema.safeParse({
            clubId: request.nextUrl.searchParams.get('clubId'),
            status: request.nextUrl.searchParams.get('status') ?? undefined,
        });
        if (!parsed.success) {
            return NextResponse.json(
                { error: parsed.error.issues[0]?.message ?? 'Datos inválidos' },
                { status: 400 },
            );
        }
        const { clubId, status } = parsed.data;

        let isStaff = false;
        try {
            await requireClubRole(user.id, clubId, ['owner', 'admin']);
            isStaff = true;
        } catch (err) {
            if (!(err instanceof AuthorizationError)) throw err;
            // Not staff — fall through to the member check below.
        }
        if (!isStaff) {
            // Any other club role counts as member; throws 403 otherwise.
            await requireClubRole(user.id, clubId, [...CLUB_ROLES]);
        }

        const effectiveStatus: GameStatus | undefined = isStaff ? (status as GameStatus | undefined) : 'published';
        const service = defaultGameService();
        const games = await service.listLibrary(clubId, effectiveStatus);

        return NextResponse.json({ success: true, games: games.map(gameSummary) });
    } catch (err) {
        if (err instanceof AuthorizationError) {
            return NextResponse.json({ error: 'Sin permiso para este club' }, { status: 403 });
        }
        console.error('[api/games] GET', err);
        return NextResponse.json(
            { error: 'No se pudo cargar la biblioteca de juegos.' },
            { status: 500 },
        );
    }
}
