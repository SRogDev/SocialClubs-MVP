import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';

import { createClient } from '@/lib/supabase/server';
import { getCreatorEarnings } from '@/services/stripeService';

/**
 * GET /api/stripe/earnings
 * 
 * Obtiene los ingresos totales y disponibles de un creator,
 * incluyendo transacciones recientes y balance de Stripe.
 */
export async function GET(request: NextRequest) {
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

        // Obtener earnings
        const earnings = await getCreatorEarnings(user.id);

        return NextResponse.json({
            success: true,
            ...earnings,
        });
    } catch (error: any) {
        console.error('Error fetching earnings:', error);
        return NextResponse.json(
            { error: error.message || 'Error al obtener ingresos' },
            { status: 500 }
        );
    }
}
