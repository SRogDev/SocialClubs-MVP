import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';

import { rateLimit, RATE_LIMITS, addRateLimitHeaders } from '@/lib/rate-limit';
import { createClient } from '@/lib/supabase/server';
import { createVideocallRoomSchema } from '@/schemas/appointmentSchema';
import { createDailyRoom } from '@/services/videocallService';

/**
 * POST /api/videocall/create-room
 * Create a Daily.co room for a booking
 * This is called by the cron job when it's time for the call
 * Can also be called manually by authorized users (creator or member)
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
        const validationResult = createVideocallRoomSchema.safeParse(body);
        if (!validationResult.success) {
            return NextResponse.json(
                { error: 'Datos inválidos', details: validationResult.error.errors },
                { status: 400 }
            );
        }

        const { booking_id } = validationResult.data;

        // Verify user is authorized (either the booking user or the club creator)
        const { data: booking } = await supabase
            .from('users_agendas')
            .select('user_id, club:clubs(creator)')
            .eq('id', booking_id)
            .single();

        if (!booking) {
            return NextResponse.json({ error: 'Reserva no encontrada' }, { status: 404 });
        }

        const isAuthorized = booking.user_id === user.id || (booking.club as any)?.creator === user.id;

        if (!isAuthorized) {
            return NextResponse.json({ error: 'No autorizado para crear room para esta reserva' }, { status: 403 });
        }

        // Create Daily.co room
        const room = await createDailyRoom(booking_id);

        const response = NextResponse.json({ success: true, data: room }, { status: 201 });
        return addRateLimitHeaders(response, request);
    } catch (error: any) {
        console.error('Error in POST /api/videocall/create-room:', error);
        return NextResponse.json({ error: error.message || 'Error interno del servidor' }, { status: 500 });
    }
}
