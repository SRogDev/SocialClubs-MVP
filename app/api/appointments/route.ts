import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { rateLimit, RATE_LIMITS, addRateLimitHeaders } from '@/lib/rate-limit';
import {
    createAppointmentSlot,
    getClubAppointments,
    getAvailableSlots,
} from '@/services/appointmentService';
import {
    createAppointmentSlotSchema,
    getAvailableSlotsSchema,
} from '@/schemas/appointmentSchema';

/**
 * GET /api/appointments
 * Get appointment slots for a club or check availability
 * Query params: club_id (required), date (optional for availability check)
 */
export async function GET(request: NextRequest) {
    // Rate limiting
    const rateLimitResult = await rateLimit(request, RATE_LIMITS.READ);
    if (rateLimitResult) return rateLimitResult;

    try {
        // Authentication
        const supabase = await createClient();
        const {
            data: { user },
            error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Get query params
        const searchParams = request.nextUrl.searchParams;
        const clubId = searchParams.get('club_id');
        const date = searchParams.get('date');

        if (!clubId) {
            return NextResponse.json({ error: 'club_id es requerido' }, { status: 400 });
        }

        let data;

        if (date) {
            // Get available slots for specific date
            const validationResult = getAvailableSlotsSchema.safeParse({ club_id: clubId, date });
            if (!validationResult.success) {
                return NextResponse.json(
                    { error: 'Datos inválidos', details: validationResult.error.errors },
                    { status: 400 }
                );
            }

            data = await getAvailableSlots(clubId, date);
        } else {
            // Get all appointment slots
            data = await getClubAppointments(clubId, true); // active only
        }

        const response = NextResponse.json({ success: true, data });
        return addRateLimitHeaders(response, request);
    } catch (error: any) {
        console.error('Error in GET /api/appointments:', error);
        return NextResponse.json({ error: error.message || 'Error interno del servidor' }, { status: 500 });
    }
}

/**
 * POST /api/appointments
 * Create a new appointment slot
 * Only club creators can create slots
 */
export async function POST(request: NextRequest) {
    // Rate limiting
    const rateLimitResult = await rateLimit(request, RATE_LIMITS.MUTATION);
    if (rateLimitResult) return rateLimitResult;

    try {
        // Authentication
        const supabase = await createClient();
        const {
            data: { user },
            error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Parse body
        const body = await request.json();

        // Validation
        const validationResult = createAppointmentSlotSchema.safeParse(body);
        if (!validationResult.success) {
            return NextResponse.json(
                { error: 'Datos inválidos', details: validationResult.error.errors },
                { status: 400 }
            );
        }

        // Create appointment slot
        const appointment = await createAppointmentSlot(validationResult.data, user.id);

        const response = NextResponse.json({ success: true, data: appointment }, { status: 201 });
        return addRateLimitHeaders(response, request);
    } catch (error: any) {
        console.error('Error in POST /api/appointments:', error);
        return NextResponse.json(
            { error: error.message || 'Error interno del servidor' },
            { status: error.message.includes('permiso') ? 403 : 500 }
        );
    }
}
