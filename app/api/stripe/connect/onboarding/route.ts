import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';

import { rateLimit } from '@/lib/rate-limit';
import { createClient } from '@/lib/supabase/server';
import { createConnectAccount, createConnectAccountLink } from '@/services/stripeService';

const limiter = rateLimit({
    interval: 60 * 1000, // 1 minuto
    uniqueTokenPerInterval: 500,
});

/**
 * POST /api/stripe/connect/onboarding
 * 
 * Crea una cuenta Stripe Connect Express y genera el AccountLink para onboarding.
 * El creator será redirigido a Stripe para completar su información.
 */
export async function POST(req: NextRequest) {
    try {
        // Rate limiting
        await limiter.check(req, 5, 'STRIPE_CONNECT_ONBOARDING');

        const supabase = await createClient();

        // Verificar autenticación
        const {
            data: { user },
            error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        // Obtener email del usuario
        const { data: userData } = await supabase
            .from('users')
            .select('email')
            .eq('id', user.id)
            .single();

        if (!userData?.email) {
            return NextResponse.json(
                { error: 'Email no encontrado' },
                { status: 400 }
            );
        }

        // Crear o recuperar cuenta Connect
        const accountId = await createConnectAccount(user.id, userData.email);

        // URLs de retorno
        const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
        const refreshUrl = `${baseUrl}/api/stripe/connect/onboarding`;
        const returnUrl = `${baseUrl}/panel/monetization?onboarding=success`;

        // Generar AccountLink
        const accountLinkUrl = await createConnectAccountLink(
            accountId,
            refreshUrl,
            returnUrl
        );

        return NextResponse.json({
            success: true,
            accountId,
            url: accountLinkUrl,
        });
    } catch (error: any) {
        console.error('Error creating Connect onboarding:', error);
        return NextResponse.json(
            { error: error.message || 'Error al crear onboarding' },
            { status: 500 }
        );
    }
}
