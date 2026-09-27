import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';

import { rateLimit } from '@/lib/rate-limit';
import { createClient } from '@/lib/supabase/server';
import { createDashboardLink } from '@/services/stripeService';

const limiter = rateLimit({
    interval: 60 * 1000, // 1 minuto
    uniqueTokenPerInterval: 500,
});

/**
 * GET /api/stripe/connect/dashboard
 * 
 * Genera un login link al Stripe Express Dashboard para que el creator
 * pueda gestionar su cuenta, ver pagos, y configurar transferencias.
 */
export async function GET(req: NextRequest) {
    try {
        // Rate limiting
        await limiter.check(req, 10, 'STRIPE_CONNECT_DASHBOARD');

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
        const { data: connectAccount, error: accountError } = await supabase
            .from('connected_stripe_accounts')
            .select('stripe_account_id, is_active')
            .eq('user_id', user.id)
            .single();

        if (accountError || !connectAccount?.stripe_account_id) {
            return NextResponse.json(
                { error: 'Cuenta Connect no encontrada. Completa el onboarding primero.' },
                { status: 404 }
            );
        }

        if (!connectAccount.is_active) {
            return NextResponse.json(
                { error: 'Cuenta Connect no activa. Completa el onboarding.' },
                { status: 403 }
            );
        }

        // Generar dashboard link
        const dashboardUrl = await createDashboardLink(connectAccount.stripe_account_id);

        return NextResponse.json({
            success: true,
            url: dashboardUrl,
        });
    } catch (error: any) {
        console.error('Error creating dashboard link:', error);
        return NextResponse.json(
            { error: error.message || 'Error al generar dashboard link' },
            { status: 500 }
        );
    }
}
