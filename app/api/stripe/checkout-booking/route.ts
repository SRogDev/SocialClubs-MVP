import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { rateLimit, RATE_LIMITS, addRateLimitHeaders } from '@/lib/rate-limit';
import { createBookingSchema } from '@/schemas/appointmentSchema';
import { getAppointmentById } from '@/services/appointmentService';

/**
 * POST /api/stripe/checkout-booking
 * Create a Stripe checkout session for booking an appointment
 * Returns checkout URL to redirect user to payment
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
        const validationResult = createBookingSchema.safeParse(body);
        if (!validationResult.success) {
            return NextResponse.json(
                { error: 'Datos inválidos', details: validationResult.error.errors },
                { status: 400 }
            );
        }

        const { appointment_id, date } = validationResult.data;

        // Get appointment details
        const appointment = await getAppointmentById(appointment_id);
        if (!appointment) {
            return NextResponse.json({ error: 'Cita no encontrada' }, { status: 404 });
        }

        // TODO: Implement Stripe checkout session creation
        // const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
        // const session = await stripe.checkout.sessions.create({
        //   mode: 'payment',
        //   line_items: [{
        //     price_data: {
        //       currency: 'usd',
        //       product_data: {
        //         name: `Videollamada - ${date}`,
        //         description: `Consulta de ${appointment.duration} minutos`,
        //       },
        //       unit_amount: appointment.price,
        //     },
        //     quantity: 1,
        //   }],
        //   metadata: {
        //     appointment_id,
        //     user_id: user.id,
        //     club_id: appointment.club_id,
        //     date,
        //   },
        //   success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/bookings/success?session_id={CHECKOUT_SESSION_ID}`,
        //   cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/clubs/${appointment.club_id}`,
        // })
        //
        // return NextResponse.json({ checkout_url: session.url })

        // Placeholder response
        return NextResponse.json({
            success: false,
            error: 'Stripe checkout aún no implementado. Configura STRIPE_SECRET_KEY y descomenta el código.',
            placeholder: true,
        });
    } catch (error: any) {
        console.error('Error in POST /api/stripe/checkout-booking:', error);
        return NextResponse.json({ error: error.message || 'Error interno del servidor' }, { status: 500 });
    }
}
