/**
 * Events v2 API — single event (master plan Phases 46-52).
 *
 * GET    /api/events/[id]  — event detail (+ attendee_count, my_rsvp)
 * PATCH  /api/events/[id]  — update (owner/admin)
 * DELETE /api/events/[id]  — cancel (status → cancelled, owner/admin)
 */
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { AuthorizationError } from '@/lib/authz';
import { addRateLimitHeaders, RATE_LIMITS, rateLimit } from '@/lib/rate-limit';
import { createClient } from '@/lib/supabase/server';
import { updateEventSchema } from '@/schemas/eventSchema';
import { cancelEvent, getEvent, updateEvent } from '@/services/eventService';

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

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    const rateLimitResult = await rateLimit(request, RATE_LIMITS.READ);
    if (rateLimitResult) return rateLimitResult;

    try {
        const user = await requireUser();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { id } = await params;
        const event = await getEvent(id, user.id);
        if (!event) return NextResponse.json({ error: 'Evento no encontrado' }, { status: 404 });
        return addRateLimitHeaders(NextResponse.json({ success: true, data: event }), request);
    } catch (error) {
        console.error('Error in GET /api/events/[id]:', error);
        return forbiddenOrInternal(error);
    }
}

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    const rateLimitResult = await rateLimit(request, RATE_LIMITS.MUTATION);
    if (rateLimitResult) return rateLimitResult;

    try {
        const user = await requireUser();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { id } = await params;
        const body = await request.json();
        const parsed = updateEventSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json(
                {
                    error: 'Datos inválidos',
                    details: parsed.error.issues.map((i) => i.message),
                },
                { status: 400 },
            );
        }

        const event = await updateEvent(id, parsed.data, user.id);
        return addRateLimitHeaders(NextResponse.json({ success: true, data: event }), request);
    } catch (error) {
        console.error('Error in PATCH /api/events/[id]:', error);
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
        const event = await cancelEvent(id, user.id);
        return addRateLimitHeaders(NextResponse.json({ success: true, data: event }), request);
    } catch (error) {
        console.error('Error in DELETE /api/events/[id]:', error);
        return forbiddenOrInternal(error);
    }
}
