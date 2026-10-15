/**
 * Events v2 API (master plan Phases 46-52).
 *
 * GET  /api/events?clubId=<uuid>&upcoming=1  — list club events
 * POST /api/events                            — create event (owner/admin)
 */
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { AuthorizationError } from '@/lib/authz';
import { addRateLimitHeaders, RATE_LIMITS, rateLimit } from '@/lib/rate-limit';
import { createClient } from '@/lib/supabase/server';
import { createEventSchema } from '@/schemas/eventSchema';
import { createEvent, listClubEvents } from '@/services/eventService';

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

export async function GET(request: NextRequest) {
    const rateLimitResult = await rateLimit(request, RATE_LIMITS.READ);
    if (rateLimitResult) return rateLimitResult;

    try {
        const user = await requireUser();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const clubId = request.nextUrl.searchParams.get('clubId');
        if (!clubId) {
            return NextResponse.json({ error: 'Falta el parámetro clubId' }, { status: 400 });
        }

        const upcomingOnly = request.nextUrl.searchParams.get('upcoming') === '1';
        const events = await listClubEvents(clubId, { upcomingOnly });
        return addRateLimitHeaders(NextResponse.json({ success: true, data: events }), request);
    } catch (error) {
        console.error('Error in GET /api/events:', error);
        return forbiddenOrInternal(error);
    }
}

export async function POST(request: NextRequest) {
    const rateLimitResult = await rateLimit(request, RATE_LIMITS.MUTATION);
    if (rateLimitResult) return rateLimitResult;

    try {
        const user = await requireUser();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const body = await request.json();
        const parsed = createEventSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json(
                {
                    error: 'Datos inválidos',
                    details: parsed.error.issues.map((i) => i.message),
                },
                { status: 400 },
            );
        }

        const event = await createEvent(parsed.data, user.id);
        return addRateLimitHeaders(
            NextResponse.json({ success: true, data: event }, { status: 201 }),
            request,
        );
    } catch (error) {
        console.error('Error in POST /api/events:', error);
        return forbiddenOrInternal(error);
    }
}
