/**
 * GET /api/posts/[postId]
 * Returns a single post by ID
 */
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit'
import { getPostById } from '@/services/postService'

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ postId: string }> }
) {
    try {
        // Apply rate limiting
        const rateLimitResult = await rateLimit(request, RATE_LIMITS.QUERY)
        if (rateLimitResult) return rateLimitResult

        const { postId } = await params

        if (!postId) {
            return NextResponse.json(
                { error: 'Bad request', message: 'Post ID is required' },
                { status: 400 }
            )
        }

        const post = await getPostById(postId)

        if (!post) {
            return NextResponse.json({ error: 'Not found' }, { status: 404 })
        }

        return NextResponse.json({ data: post })
    } catch (error) {
        console.error('Error in GET /api/posts/[postId]:', error)
        return NextResponse.json(
            {
                error: 'Internal server error',
                message: error instanceof Error ? error.message : 'Failed to fetch post'
            },
            { status: 500 }
        )
    }
}
