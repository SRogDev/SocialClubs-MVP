/**
 * POST /api/games/[id]/bridge  — BridgeRequest envelope { sessionId, method, params }
 *
 * The host-side endpoint of the Club Bridge. The GamePlayer forwards the
 * sandboxed game's request here; this route binds the call to the
 * authenticated user BEFORE dispatching: the session must exist, belong
 * to this game, and belong to the caller (else 403). Capability checks,
 * caps, expiry and idempotency all live in the service.
 *
 * Always answers HTTP 200 with the BridgeCallResult JSON
 * ({ ok: true, result } | { ok: false, code, message }) for well-formed,
 * authorized calls — the GamePlayer translates it into a bridge response
 * envelope for the iframe.
 */
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { BRIDGE_METHODS } from '@/lib/games/bridge';
import { defaultGameService } from '@/lib/games/service';
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit';

import { gamesDisabledResponse, requireUser } from '../../shared';

const bodySchema = z.object({
    sessionId: z.string().min(1),
    method: z.enum(BRIDGE_METHODS),
    params: z.record(z.string(), z.unknown()).optional(),
});

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    const disabled = gamesDisabledResponse();
    if (disabled) return disabled;
    try {
        // Bridge calls are frequent during play; the per-session service
        // rate limit is the real gate, so the IP limit stays lenient.
        const limited = await rateLimit(request, RATE_LIMITS.READ);
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
        const { sessionId, method, params: callParams } = parsed.data;
        const { id } = await params;

        const service = defaultGameService();
        const session = await service.getSession(sessionId);
        if (!session || session.gameId !== id || session.userId !== user.id) {
            return NextResponse.json(
                { error: 'La sesión no pertenece a este juego o a tu usuario.' },
                { status: 403 },
            );
        }

        const result = await service.handleBridgeCall({
            sessionId,
            method,
            params: callParams,
        });
        return NextResponse.json(result, { status: 200 });
    } catch (err) {
        console.error('[api/games/[id]/bridge]', err);
        return NextResponse.json(
            { ok: false, code: 'INTERNAL', message: 'Error interno del puente del club.' },
            { status: 200 },
        );
    }
}
