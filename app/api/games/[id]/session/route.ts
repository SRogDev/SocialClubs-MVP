/**
 * POST /api/games/[id]/session  { kind: 'play' | 'preview' }
 *
 * Starts a server-issued session and returns the ONLY playable document
 * this surface ever serves: the stored HTML composed with the platform
 * CSP + trusted ClubGame SDK, bound to the new session id.
 * - preview: staff only (creator testing a draft in the studio).
 * - play: club members only, published games only (enforced by the service).
 */
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { AuthorizationError, requireClubRole } from '@/lib/authz';
import { composePlayableHtml } from '@/lib/games/bridge';
import { defaultGameService } from '@/lib/games/service';
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit';

import { gamesDisabledResponse, requireUser } from '../../shared';

const bodySchema = z.object({
    kind: z.enum(['play', 'preview']),
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

        if (parsed.data.kind === 'preview') {
            const game = await service.getGame(id);
            if (!game) {
                return NextResponse.json({ error: 'Juego no encontrado' }, { status: 404 });
            }
            await requireClubRole(user.id, game.clubId, ['owner', 'admin']);
        }

        try {
            const { session, game } = await service.startSession({
                gameId: id,
                userId: user.id,
                kind: parsed.data.kind,
            });
            const html = composePlayableHtml(game.html, { sessionId: session.id });
            return NextResponse.json({ success: true, sessionId: session.id, html });
        } catch (err) {
            // Service throws for unknown games, unpublished play attempts
            // and non-member players — all client-visible 400/403 cases.
            const message = err instanceof Error ? err.message : 'No se pudo iniciar la sesión';
            const status = /not found/i.test(message)
                ? 404
                : /only club members/i.test(message)
                  ? 403
                  : 400;
            return NextResponse.json({ error: message }, { status });
        }
    } catch (err) {
        if (err instanceof AuthorizationError) {
            return NextResponse.json({ error: 'Sin permiso para este club' }, { status: 403 });
        }
        console.error('[api/games/[id]/session]', err);
        return NextResponse.json(
            { error: 'No se pudo iniciar la sesión de juego.' },
            { status: 500 },
        );
    }
}
