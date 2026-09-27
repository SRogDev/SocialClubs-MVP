import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';

import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/test/trigger-cron
 * Development-only endpoint to manually trigger the cron job
 * Simulates the cron by calling the check-appointments endpoint
 *
 * WARNING: Only use in development! Should be disabled in production.
 */
export async function GET(request: NextRequest) {
    // Only allow in development
    if (process.env.NODE_ENV === 'production') {
        return NextResponse.json({ error: 'Endpoint deshabilitado en producción' }, { status: 403 });
    }

    try {
        // Verify user is authenticated (basic protection for dev)
        const supabase = await createClient();
        const {
            data: { user },
            error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized - debes estar autenticado' }, { status: 401 });
        }

        // Call the cron endpoint with the secret
        const cronSecret = process.env.CRON_SECRET || 'dev-secret';
        const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

        const response = await fetch(`${baseUrl}/api/cron/check-appointments`, {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${cronSecret}`,
            },
        });

        const data = await response.json();

        return NextResponse.json({
            success: true,
            message: 'Cron job triggered manually (DEV mode)',
            result: data,
        });
    } catch (error: any) {
        console.error('Error triggering cron:', error);
        return NextResponse.json({ error: error.message || 'Error interno del servidor' }, { status: 500 });
    }
}

// Also support POST
export async function POST(request: NextRequest) {
    return GET(request);
}
