import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { rateLimit, RATE_LIMITS, addRateLimitHeaders } from '@/lib/rate-limit';
import { getUserBookings, getClubBookings, cancelBooking } from '@/services/bookingService';
import { getBookingsSchema, cancelBookingSchema } from '@/schemas/appointmentSchema';

/**
 * GET /api/bookings
 * Get bookings for user or club
 * Query params: user_id, club_id, status, from_date, to_date
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
        const status = searchParams.get('status') as any;
        const fromDate = searchParams.get('from_date');
        const toDate = searchParams.get('to_date');

        const filters: any = {};
        if (status) filters.status = status;
        if (fromDate) filters.from_date = fromDate;
        if (toDate) filters.to_date = toDate;

        let data;

        if (clubId) {
            // Get bookings for club (creator view)
            // Verify user is club creator
            const { data: club } = await supabase.from('clubs').select('creator').eq('id', clubId).single();

            if (!club || club.creator !== user.id) {
                return NextResponse.json({ error: 'No autorizado para ver reservas de este club' }, { status: 403 });
            }

            data = await getClubBookings(clubId, filters);
        } else {
            // Get bookings for current user
            data = await getUserBookings(user.id, filters);
        }

        const response = NextResponse.json({ success: true, data });
        return addRateLimitHeaders(response, request);
    } catch (error: any) {
        console.error('Error in GET /api/bookings:', error);
        return NextResponse.json({ error: error.message || 'Error interno del servidor' }, { status: 500 });
    }
}

/**
 * POST /api/bookings
 * Create a new booking (will redirect to Stripe checkout)
 * This creates a pending booking that gets confirmed after payment
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

        // This endpoint will redirect to Stripe checkout
        // The actual booking creation happens in the Stripe webhook
        // So we just return checkout URL
        return NextResponse.json(
            {
                success: true,
                message: 'Use /api/stripe/checkout-booking para iniciar el proceso de pago',
                redirect: '/api/stripe/checkout-booking',
            },
            { status: 200 }
        );
    } catch (error: any) {
        console.error('Error in POST /api/bookings:', error);
        return NextResponse.json({ error: error.message || 'Error interno del servidor' }, { status: 500 });
    }
}

/**
 * DELETE /api/bookings/[id]
 * Cancel a booking
 */
export async function DELETE(request: NextRequest) {
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
        const validationResult = cancelBookingSchema.safeParse(body);
        if (!validationResult.success) {
            return NextResponse.json(
                { error: 'Datos inválidos', details: validationResult.error.errors },
                { status: 400 }
            );
        }

        // Cancel booking
        const booking = await cancelBooking(validationResult.data, user.id);

        const response = NextResponse.json({ success: true, data: booking });
        return addRateLimitHeaders(response, request);
    } catch (error: any) {
        console.error('Error in DELETE /api/bookings:', error);
        return NextResponse.json(
            { error: error.message || 'Error interno del servidor' },
            { status: error.message.includes('permiso') ? 403 : 500 }
        );
    }
}
