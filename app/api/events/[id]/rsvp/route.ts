/**
 * Events v2 API — RSVP (master plan Phases 46-52).
 *
 * POST   /api/events/[id]/rsvp  — RSVP {status: going|interested|not_going}
 * DELETE /api/events/[id]/rsvp  — remove RSVP
 */
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { AuthorizationError } from '@/lib/authz';
import { addRateLimitHeaders, RATE_LIMITS, rateLimit } from '@/lib/rate-limit';
import { createClient } from '@/lib/supabase/server';
import { rsvpSchema } from '@/schemas/eventSchema';
import { rsvpEvent, unrsvpEvent } from '@/services/eventService';

async function requireUser() {
    const supabase = await createClient();
    const {
        data: { user },
        error,
    } = await supabase.auth.getUser();
    if (error || !user) return null;
    return user;
}

function forbiddenOrInternal(error: unknown) {
    if (error instanceof AuthorizationError) {
        return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json(
        { error: error instanceof Error ? error.message : 'Error interno del servidor' },
        { status: 500 },
    );
}

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    const rateLimitResult = await rateLimit(request, RATE_LIMITS.MUTATION);
    if (rateLimitResult) return rateLimitResult;

    try {
        const user = await requireUser();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { id } = await params;
        const body = await request.json().catch(() => ({}));
        const parsed = rsvpSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json(
                {
                    error: 'Datos inválidos',
                    details: parsed.error.issues.map((i) => i.message),
                },
                { status: 400 },
            );
        }

        const rsvp = await rsvpEvent(id, user.id, parsed.data.status);
        return addRateLimitHeaders(
            NextResponse.json({ success: true, data: rsvp }),
            request,
        );
    } catch (error) {
        console.error('Error in POST /api/events/[id]/rsvp:', error);
        return forbiddenOrInternal(error);
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    const rateLimitResult = await rateLimit(request, RATE_LIMITS.MUTATION);
    if (rateLimitResult) return rateLimitResult;

    try {
        const user = await requireUser();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { id } = await params;
        await unrsvpEvent(id, user.id);
        return addRateLimitHeaders(NextResponse.json({ success: true }), request);
    } catch (error) {
        console.error('Error in DELETE /api/events/[id]/rsvp:', error);
        return forbiddenOrInternal(error);
    }
}
