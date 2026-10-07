/**
 * GET /api/posts/trending
 * Returns trending posts ordered by engagement
 */
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit'
import { getTrendingPosts } from '@/services/postService'

export async function GET(request: NextRequest) {
    try {
        // Apply rate limiting
        const rateLimitResult = await rateLimit(request, RATE_LIMITS.QUERY)
        if (rateLimitResult) return rateLimitResult

        const posts = await getTrendingPosts()

        return NextResponse.json({ data: posts })
    } catch (error) {
        console.error('Error in GET /api/posts/trending:', error)
        return NextResponse.json(
            {
                error: 'Internal server error',
                message: error instanceof Error ? error.message : 'Failed to fetch trending posts'
            },
            { status: 500 }
        )
    }
}
