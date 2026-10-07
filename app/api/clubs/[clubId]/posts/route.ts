/**
 * GET /api/clubs/[clubId]/posts
 * Returns posts for a club, newest first
 */
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit'
import { getPosts } from '@/services/postService'

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

        const posts = await getPosts(clubId)

        return NextResponse.json({ data: posts })
    } catch (error) {
        console.error('Error in GET /api/clubs/[clubId]/posts:', error)
        return NextResponse.json(
            {
                error: 'Internal server error',
                message: error instanceof Error ? error.message : 'Failed to fetch club posts'
            },
            { status: 500 }
        )
    }
}
