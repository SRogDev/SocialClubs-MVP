/**
 * GET /api/clubs/featured
 * Returns featured clubs for the explore page
 */
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit'
import { getFeaturedClubs } from '@/services/exploreService'

export async function GET(request: NextRequest) {
    try {
        // Apply rate limiting
        const rateLimitResult = await rateLimit(request, RATE_LIMITS.QUERY)
        if (rateLimitResult) return rateLimitResult

        const clubs = await getFeaturedClubs()

        return NextResponse.json({ data: clubs })
    } catch (error) {
        console.error('Error in GET /api/clubs/featured:', error)
        return NextResponse.json(
            {
                error: 'Internal server error',
                message: error instanceof Error ? error.message : 'Failed to fetch featured clubs'
            },
            { status: 500 }
        )
    }
}
