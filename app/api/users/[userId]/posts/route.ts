/**
 * GET /api/users/[userId]/posts
 * Returns the posts authored by a user, newest first
 */
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit'
import { createClient } from '@/lib/supabase/server'
import { getUserPosts } from '@/services/postService'

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ userId: string }> }
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

        const { userId } = await params

        if (!userId) {
            return NextResponse.json(
                { error: 'Bad request', message: 'User ID is required' },
                { status: 400 }
            )
        }

        const posts = await getUserPosts(userId)

        return NextResponse.json({ data: posts })
    } catch (error) {
        console.error('Error in GET /api/users/[userId]/posts:', error)
        return NextResponse.json(
            {
                error: 'Internal server error',
                message: error instanceof Error ? error.message : 'Failed to fetch user posts'
            },
            { status: 500 }
        )
    }
}
