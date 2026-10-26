/**
 * POST /api/games/[id]/attach  { eventId?: uuid|null, postId?: uuid|null }
 *
 * Staff-only: bind (or unbind, with null) a game to an event and/or a post.
 * Only the provided keys change — omitted keys keep their current value
 * (the service applies the same undefined-vs-null semantics).
 */
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { AuthorizationError, requireClubRole } from '@/lib/authz';
import { defaultGameService } from '@/lib/games/service';
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit';

import { gameSummary, gamesDisabledResponse, requireUser } from '../../shared';

const bodySchema = z.object({
    eventId: z.string().uuid('eventId inválido').nullable().optional(),
    postId: z.string().uuid('postId inválido').nullable().optional(),
});

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    const disabled = gamesDisabledResponse();
    if (disabled) return disabled;
    try {
        const limited = await rateLimit(request, RATE_LIMITS.MUTATION);
        if (limited) return limited;

        const { user, response } = await requireUser();
        if (!user) return response;

        const parsed = bodySchema.safeParse(await request.json().catch(() => null));
        if (!parsed.success) {
            return NextResponse.json(
                { error: parsed.error.issues[0]?.message ?? 'Datos inválidos' },
                { status: 400 },
            );
        }

        const { id } = await params;
        const service = defaultGameService();
        const game = await service.getGame(id);
        if (!game) {
            return NextResponse.json({ error: 'Juego no encontrado' }, { status: 404 });
        }
        await requireClubRole(user.id, game.clubId, ['owner', 'admin']);

        const updated = await service.attachGame(id, parsed.data);
        return NextResponse.json({ success: true, game: gameSummary(updated) });
    } catch (err) {
        if (err instanceof AuthorizationError) {
            return NextResponse.json({ error: 'Sin permiso para este club' }, { status: 403 });
        }
        console.error('[api/games/[id]/attach]', err);
        return NextResponse.json(
            { error: 'No se pudo vincular el juego.' },
            { status: 500 },
        );
    }
}
