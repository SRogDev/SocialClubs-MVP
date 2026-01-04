import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getConnectAccountStatus } from '@/services/stripeService';

/**
 * GET /api/stripe/connect/status
 * 
 * Obtiene el estado de la cuenta Stripe Connect del creator.
 * Indica si puede recibir pagos, si tiene pagos pendientes, etc.
 */
export async function GET(req: NextRequest) {
    try {
        const supabase = await createClient();

        // Verificar autenticación
        const {
            data: { user },
            error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        // Obtener cuenta Connect
        const { data: connectAccount } = await supabase
            .from('connected_stripe_accounts')
            .select('stripe_account_id, is_active')
            .eq('user_id', user.id)
            .single();

        if (!connectAccount?.stripe_account_id) {
            return NextResponse.json({
                hasAccount: false,
                isActive: false,
            });
        }

        // Obtener estado desde Stripe
        const status = await getConnectAccountStatus(connectAccount.stripe_account_id);

        return NextResponse.json({
            hasAccount: true,
            isActive: connectAccount.is_active,
            chargesEnabled: status.charges_enabled,
            payoutsEnabled: status.payouts_enabled,
            detailsSubmitted: status.details_submitted,
            requirements: status.requirements,
        });
    } catch (error: any) {
        console.error('Error getting Connect status:', error);
        return NextResponse.json(
            { error: error.message || 'Error al obtener estado' },
            { status: 500 }
        );
    }
}
