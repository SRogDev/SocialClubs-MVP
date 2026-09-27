import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit';
import { createClient } from '@/lib/supabase/server';
import { createSubscriptionCheckoutSession } from '@/services/stripeService';


const checkoutSchema = z.object({
    club_id: z.string().uuid(),
    membership_id: z.string().uuid(),
});

/**
 * POST /api/stripe/subscriptions/checkout
 * 
 * Crea una sesión de checkout de Stripe para suscripción recurrente a un club.
 * Aplica comisión de plataforma (10%) automáticamente.
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
        const validationResult = checkoutSchema.safeParse(body);

        if (!validationResult.success) {
            return NextResponse.json(
                { error: 'Datos inválidos', details: validationResult.error.errors },
                { status: 400 }
            );
        }

        const { club_id, membership_id } = validationResult.data;

        // Obtener membership con stripe_price_id
        const { data: membership, error: membershipError } = await supabase
            .from('memberships')
            .select('*, club:clubs(user_id)')
            .eq('id', membership_id)
            .eq('club_id', club_id)
            .single();

        if (membershipError || !membership) {
            return NextResponse.json(
                { error: 'Membership no encontrada' },
                { status: 404 }
            );
        }

        if (!membership.stripe_price_id) {
            return NextResponse.json(
                { error: 'Este plan no tiene configuración de pagos' },
                { status: 400 }
            );
        }

        // Obtener cuenta Connect del creator
        const creatorId = membership.club.user_id;
        const { data: connectAccount } = await supabase
            .from('connected_stripe_accounts')
            .select('stripe_account_id, is_active')
            .eq('user_id', creatorId)
            .single();

        if (!connectAccount?.stripe_account_id || !connectAccount.is_active) {
            return NextResponse.json(
                { error: 'El creator no tiene cuenta de pagos configurada' },
                { status: 400 }
            );
        }

        // Verificar que no esté ya suscrito
        const { data: existingSubscription } = await supabase
            .from('users_memberships')
            .select('id')
            .eq('user', user.id)
            .eq('membership', membership_id)
            .eq('status', 'active')
            .single();

        if (existingSubscription) {
            return NextResponse.json(
                { error: 'Ya tienes una suscripción activa a este plan' },
                { status: 400 }
            );
        }

        // Crear sesión de checkout
        const session = await createSubscriptionCheckoutSession({
            userId: user.id,
            clubId: club_id,
            membershipId: membership_id,
            stripePriceId: membership.stripe_price_id,
            connectedAccountId: connectAccount.stripe_account_id,
        });

        return NextResponse.json({
            success: true,
            checkout_url: session.url,
            session_id: session.id,
        });
    } catch (error: any) {
        console.error('Error creating subscription checkout:', error);
        return NextResponse.json(
            { error: error.message || 'Error al crear checkout de suscripción' },
            { status: 500 }
        );
    }
}
