import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit';
import { createBookingSchema } from '@/schemas/appointmentSchema';
import { getAppointmentById } from '@/services/appointmentService';
import { createBookingCheckoutSession } from '@/services/stripeService';

/**
 * POST /api/stripe/checkout-booking
 * 
 * Crea una sesión de checkout de Stripe para reservar una videollamada.
 * Aplica comisión de plataforma (10%) y redirige fondos al creator vía Connect.
 */
export async function POST(request: NextRequest) {
    // Rate limiting
    const rateLimitResult = await rateLimit(request, RATE_LIMITS.MUTATION);
    if (rateLimitResult) return rateLimitResult;

    try {
        // Autenticación
        const supabase = await createClient();
        const {
            data: { user },
            error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        // Parse y validación
        const body = await request.json();
        const validationResult = createBookingSchema.safeParse(body);

        if (!validationResult.success) {
            return NextResponse.json(
                { error: 'Datos inválidos', details: validationResult.error.errors },
                { status: 400 }
            );
        }

        const { appointment_id, date } = validationResult.data;

        // Obtener detalles de la cita
        const appointment = await getAppointmentById(appointment_id);
        if (!appointment) {
            return NextResponse.json({ error: 'Cita no encontrada' }, { status: 404 });
        }

        // Verificar que la cita tenga precio
        if (!appointment.price || appointment.price <= 0) {
            return NextResponse.json(
                { error: 'La cita no tiene un precio válido' },
                { status: 400 }
            );
        }

        // Obtener cuenta Connect del creator
        const { data: connectAccount } = await supabase
            .from('connected_stripe_accounts')
            .select('stripe_account_id, is_active')
            .eq('user_id', appointment.user_id)
            .single();

        if (!connectAccount?.stripe_account_id || !connectAccount.is_active) {
            return NextResponse.json(
                { error: 'El creator no tiene una cuenta de pagos configurada' },
                { status: 400 }
            );
        }

        // Crear sesión de checkout con Stripe
        const session = await createBookingCheckoutSession({
            appointmentId: appointment_id,
            date,
            userId: user.id,
            clubId: appointment.club_id,
            price: appointment.price,
            duration: appointment.duration,
            connectedAccountId: connectAccount.stripe_account_id,
        });

        return NextResponse.json({
            success: true,
            checkout_url: session.url,
            session_id: session.id,
        });
    } catch (error: any) {
        console.error('Error creating checkout session:', error);
        return NextResponse.json(
            { error: error.message || 'Error al crear sesión de pago' },
            { status: 500 }
        );
    }
}
