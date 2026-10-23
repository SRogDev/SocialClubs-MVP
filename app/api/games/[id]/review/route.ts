/**
 * POST /api/games/[id]/review  { action: 'approve' | 'reject' }
 *
 * Staff-only creator review. Approving publishes the game (the service
 * refuses to publish a draft whose validation failed); rejecting moves it
 * to 'rejected'. Invalid transitions surface as 400 with the service
 * message so the studio can show why.
 */
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { AuthorizationError, requireClubRole } from '@/lib/authz';
import { defaultGameService } from '@/lib/games/service';
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit';

import { gameSummary, gamesDisabledResponse, requireUser } from '../../shared';

const bodySchema = z.object({
    action: z.enum(['approve', 'reject']),
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

        try {
            const updated = await service.reviewGame(id, parsed.data.action);
            return NextResponse.json({ success: true, game: gameSummary(updated) });
        } catch (err) {
            // Service throws on invalid transitions (not a draft, failed
            // validation on approve) — a client-visible 400, not a 500.
            const message = err instanceof Error ? err.message : 'Transición no válida';
            return NextResponse.json({ error: message }, { status: 400 });
        }
    } catch (err) {
        if (err instanceof AuthorizationError) {
            return NextResponse.json({ error: 'Sin permiso para este club' }, { status: 403 });
        }
        console.error('[api/games/[id]/review]', err);
        return NextResponse.json(
            { error: 'No se pudo revisar el juego.' },
            { status: 500 },
        );
    }
}
