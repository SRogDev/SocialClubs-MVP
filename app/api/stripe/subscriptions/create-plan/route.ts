import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit';
import { createSubscriptionPlan } from '@/services/stripeService';
import { z } from 'zod';

const createPlanSchema = z.object({
    club_id: z.string().uuid(),
    membership_id: z.string().uuid(),
    name: z.string().min(1).max(100),
    description: z.string().optional(),
    price: z.number().int().positive(), // En centavos
});

/**
 * POST /api/stripe/subscriptions/create-plan
 * 
 * Crea un producto y precio en Stripe para una membership de club.
 * El creator debe tener una cuenta Connect activa.
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
        const validationResult = createPlanSchema.safeParse(body);

        if (!validationResult.success) {
            return NextResponse.json(
                { error: 'Datos inválidos', details: validationResult.error.errors },
                { status: 400 }
            );
        }

        const { club_id, membership_id, name, description, price } = validationResult.data;

        // Verificar ownership del club
        const { data: club } = await supabase
            .from('clubs')
            .select('user_id')
            .eq('id', club_id)
            .single();

        if (!club || club.user_id !== user.id) {
            return NextResponse.json(
                { error: 'No tienes permisos para este club' },
                { status: 403 }
            );
        }

        // Obtener cuenta Connect
        const { data: connectAccount } = await supabase
            .from('connected_stripe_accounts')
            .select('stripe_account_id, is_active')
            .eq('user_id', user.id)
            .single();

        if (!connectAccount?.stripe_account_id || !connectAccount.is_active) {
            return NextResponse.json(
                { error: 'Debes configurar tu cuenta de pagos primero' },
                { status: 400 }
            );
        }

        // Crear producto y precio en Stripe
        const stripePriceId = await createSubscriptionPlan({
            connectedAccountId: connectAccount.stripe_account_id,
            clubId: club_id,
            membershipId: membership_id,
            name,
            description: description || `Suscripción a ${name}`,
            price,
        });

        // Actualizar membership con stripe_price_id
        const { error: updateError } = await supabase
            .from('memberships')
            .update({ stripe_price_id: stripePriceId })
            .eq('id', membership_id);

        if (updateError) {
            console.error('Error updating membership:', updateError);
            throw new Error('Error al actualizar membership');
        }

        return NextResponse.json({
            success: true,
            stripe_price_id: stripePriceId,
        });
    } catch (error: any) {
        console.error('Error creating subscription plan:', error);
        return NextResponse.json(
            { error: error.message || 'Error al crear plan de suscripción' },
            { status: 500 }
        );
    }
}
