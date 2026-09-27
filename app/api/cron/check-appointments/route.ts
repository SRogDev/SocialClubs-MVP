import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';

import { getUpcomingBookings } from '@/services/bookingService';
import { createDailyRoom, expireOldRooms } from '@/services/videocallService';

/**
 * GET /api/cron/check-appointments
 * Cron job that runs every 5 minutes to:
 * 1. Find bookings that should start soon (within 5 min window)
 * 2. Create Daily.co rooms for those bookings
 * 3. Expire old rooms that have passed their expiration time
 *
 * Called by Vercel Cron (configured in vercel.json)
 * Schedule: every 5 minutes (cron expression "star-slash-5 star star star star")
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

        console.log('[CRON] Starting appointment check...');

        // Get upcoming bookings (within 5 minute window)
        const upcomingBookings = await getUpcomingBookings(5);

        console.log(`[CRON] Found ${upcomingBookings.length} upcoming bookings`);

        const results = {
            roomsCreated: 0,
            roomsFailed: 0,
            roomsExpired: 0,
            errors: [] as string[],
        };

        // Create rooms for upcoming bookings
        for (const booking of upcomingBookings) {
            try {
                console.log(`[CRON] Creating room for booking ${booking.id}`);
                await createDailyRoom(booking.id);
                results.roomsCreated++;
            } catch (error: any) {
                console.error(`[CRON] Error creating room for booking ${booking.id}:`, error);
                results.roomsFailed++;
                results.errors.push(`Booking ${booking.id}: ${error.message}`);
            }
        }

        // Expire old rooms
        try {
            const expiredCount = await expireOldRooms();
            results.roomsExpired = expiredCount;
            console.log(`[CRON] Expired ${expiredCount} old rooms`);
        } catch (error: any) {
            console.error('[CRON] Error expiring old rooms:', error);
            results.errors.push(`Expire rooms: ${error.message}`);
        }

        console.log('[CRON] Appointment check complete:', results);

        return NextResponse.json({
            success: true,
            timestamp: new Date().toISOString(),
            results,
        });
    } catch (error: any) {
        console.error('[CRON] Fatal error in check-appointments:', error);
        return NextResponse.json(
            {
                error: 'Internal server error',
                message: error.message,
                timestamp: new Date().toISOString(),
            },
            { status: 500 }
        );
    }
}

// Also support POST for manual triggers
export async function POST(request: NextRequest) {
    return GET(request);
}
