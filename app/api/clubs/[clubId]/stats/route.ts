/**
 * GET /api/clubs/[clubId]/stats
 * Returns statistics for a club
 */
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit'
import { getClubStats } from '@/services/clubService'

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ clubId: string }> }
) {
    try {
        // Apply rate limiting
        const rateLimitResult = await rateLimit(request, RATE_LIMITS.QUERY)
        if (rateLimitResult) return rateLimitResult

        const { clubId } = await params

        if (!clubId) {
            return NextResponse.json(
                { error: 'Bad request', message: 'Club ID is required' },
                { status: 400 }
            )
        }

        const stats = await getClubStats(clubId)

        return NextResponse.json({ data: stats })
    } catch (error) {
        console.error('Error in GET /api/clubs/[clubId]/stats:', error)
        return NextResponse.json(
            {
                error: 'Internal server error',
                message: error instanceof Error ? error.message : 'Failed to fetch club stats'
            },
            { status: 500 }
        )
    }
}
