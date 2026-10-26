/**
 * POST /api/games/generate  { clubId, prompt, eventId? }
 *
 * Staff-only (owner/admin): runs the generation pipeline (brief → free
 * codegen → static validation) and stores the result as a draft. A draft
 * that failed validation is still stored and returned WITH its report —
 * the creator must see the violations, never a silent drop.
 * The HTML artifact is never returned here.
 */
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { AIAgentError } from '@/lib/ai/types';
import { AuthorizationError, requireClubRole } from '@/lib/authz';
import { generateGame } from '@/lib/games/generate';
import { defaultGameService } from '@/lib/games/service';
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit';

import { gamesDisabledResponse, requireUser } from '../shared';

const bodySchema = z.object({
    clubId: z.string().uuid('clubId inválido'),
    prompt: z.string().trim().min(10, 'Describe el juego con al menos 10 caracteres').max(1000),
    eventId: z.string().uuid('eventId inválido').nullable().optional(),
});

export async function POST(request: NextRequest) {
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
        const { clubId, prompt, eventId } = parsed.data;

        await requireClubRole(user.id, clubId, ['owner', 'admin']);

        const generated = await generateGame({
            clubId,
            prompt,
            createdBy: user.id,
            eventId: eventId ?? null,
        });

        const service = defaultGameService();
        const draft = await service.createDraft({
            clubId,
            prompt,
            brief: generated.brief,
            html: generated.html,
            validation: generated.validation,
            mock: generated.mock,
            createdBy: user.id,
            eventId: eventId ?? null,
        });

        return NextResponse.json(
            {
                success: true,
                game: {
                    id: draft.id,
                    title: draft.title,
                    status: draft.status,
                    brief: draft.brief,
                    validation: draft.validation,
                    mock: draft.mock,
                },
            },
            { status: 201 },
        );
    } catch (err) {
        if (err instanceof AuthorizationError) {
            return NextResponse.json({ error: 'Sin permiso para este club' }, { status: 403 });
        }
        if (err instanceof AIAgentError) {
            const status =
                err.code === 'AI_INPUT_BLOCKED'
                    ? 400
                    : err.code === 'AI_BUDGET_EXCEEDED'
                      ? 402
                      : err.code === 'AI_FLAG_DISABLED'
                        ? 404
                        : 502;
            return NextResponse.json({ error: err.message, code: err.code }, { status });
        }
        console.error('[api/games/generate]', err);
        return NextResponse.json(
            { error: 'No se pudo generar el minijuego.' },
            { status: 500 },
        );
    }
}
