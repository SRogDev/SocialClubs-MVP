import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createPortalSession } from '@/services/stripeService';

/**
 * POST /api/stripe/portal
 * 
 * Genera un link al Customer Portal de Stripe donde los usuarios pueden:
 * - Cancelar suscripciones
 * - Actualizar métodos de pago
 * - Ver historial de facturas
 * - Descargar recibos
 */
export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient();

        // Autenticación
        const {
            data: { user },
            error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        // Obtener Stripe Customer ID
        const { data: userData } = await supabase
            .from('users')
            .select('stripe_customer_id')
            .eq('id', user.id)
            .single();

        if (!userData?.stripe_customer_id) {
            return NextResponse.json(
                { error: 'No tienes suscripciones activas' },
                { status: 404 }
            );
        }

        // Generar portal session
        const body = await request.json();
        const returnUrl =
            body.return_url || `${process.env.NEXT_PUBLIC_SITE_URL}/profile`;

        const portalUrl = await createPortalSession(
            userData.stripe_customer_id,
            returnUrl
        );

        return NextResponse.json({
            success: true,
            url: portalUrl,
        });
    } catch (error: any) {
        console.error('Error creating portal session:', error);
        return NextResponse.json(
            { error: error.message || 'Error al crear portal session' },
            { status: 500 }
        );
    }
}
