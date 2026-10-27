import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { expireOldRooms } from '@/services/videocallService';

/**
 * GET /api/cron/check-appointments
 * Daily cleanup cron: expires videocall rooms whose expiration time has
 * passed. Room creation is NOT done here anymore — rooms are created
 * on demand when a participant joins (/videocall/join/<bookingId>).
 *
 * The old every-5-minutes schedule violated Vercel's Hobby cron limit
 * (once per day) and blocked all deployments, so it was removed from
 * vercel.json. This endpoint is now scheduled once a day.
 *
 * Called by Vercel Cron (configured in vercel.json)
 * Schedule: daily (cron expression "0 3 * * *")
 */
export async function GET(request: NextRequest) {
    try {
        // Verify cron secret for security
        const authHeader = request.headers.get('authorization');
        const cronSecret = process.env.CRON_SECRET;

        if (!cronSecret) {
            console.error('CRON_SECRET not configured');
            return NextResponse.json({ error: 'Cron secret not configured' }, { status: 500 });
        }

        if (authHeader !== `Bearer ${cronSecret}`) {
            console.error('Invalid cron authorization');
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        console.log('[CRON] Starting videocall room cleanup...');

        // Expire old rooms
        let roomsExpired = 0;
        try {
            roomsExpired = await expireOldRooms();
            console.log(`[CRON] Expired ${roomsExpired} old rooms`);
        } catch (error: any) {
            console.error('[CRON] Error expiring old rooms:', error);
            return NextResponse.json(
                {
                    error: 'Error expiring rooms',
                    message: error.message,
                    timestamp: new Date().toISOString(),
                },
                { status: 500 },
            );
        }

        console.log('[CRON] Videocall room cleanup complete:', { roomsExpired });

        return NextResponse.json({
            success: true,
            timestamp: new Date().toISOString(),
            results: { roomsExpired },
        });
    } catch (error: any) {
        console.error('[CRON] Fatal error in check-appointments:', error);
        return NextResponse.json(
            {
                error: 'Internal server error',
                message: error.message,
                timestamp: new Date().toISOString(),
            },
            { status: 500 },
        );
    }
}

// Also support POST for manual triggers
export async function POST(request: NextRequest) {
    return GET(request);
}
