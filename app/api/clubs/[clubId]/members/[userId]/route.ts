/**
 * GET /api/clubs/[clubId]/members/[userId]
 * Returns whether a user is a member of a club
 */
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit'
import { createClient } from '@/lib/supabase/server'
import { isUserClubMember } from '@/services/clubService'

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ clubId: string; userId: string }> }
) {
    try {
        // Apply rate limiting
        const rateLimitResult = await rateLimit(request, RATE_LIMITS.QUERY)
        if (rateLimitResult) return rateLimitResult

        // Verify authentication
        const supabase = await createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return NextResponse.json(
                { error: 'Unauthorized', message: 'You must be logged in' },
                { status: 401 }
            )
        }

        const { clubId, userId } = await params

        if (!clubId || !userId) {
            return NextResponse.json(
                { error: 'Bad request', message: 'Club ID and User ID are required' },
                { status: 400 }
            )
        }

        const isMember = await isUserClubMember(userId, clubId)

        return NextResponse.json({ data: { isMember } })
    } catch (error) {
        console.error('Error in GET /api/clubs/[clubId]/members/[userId]:', error)
        return NextResponse.json(
            {
                error: 'Internal server error',
                message: error instanceof Error ? error.message : 'Failed to check membership'
            },
            { status: 500 }
        )
    }
}
