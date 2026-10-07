/**
 * GET /api/clubs/[clubId]/members
 * Returns the members of a club with their user data
 */
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit'
import { getClubMembers } from '@/services/clubService'

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

        const members = await getClubMembers(clubId)

        return NextResponse.json({ data: members })
    } catch (error) {
        console.error('Error in GET /api/clubs/[clubId]/members:', error)
        return NextResponse.json(
            {
                error: 'Internal server error',
                message: error instanceof Error ? error.message : 'Failed to fetch club members'
            },
            { status: 500 }
        )
    }
}
