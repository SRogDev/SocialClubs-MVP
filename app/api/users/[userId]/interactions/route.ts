/**
 * GET /api/users/[userId]/interactions?postIds=a,b,c
 * Returns the user's interactions (likes/superlikes) for the given posts
 */
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit'
import { createClient } from '@/lib/supabase/server'
import { getUserPostInteractions } from '@/services/postService'

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

        // Read postIds from the query string (?postIds=a,b,c)
        const postIdsParam = new URL(request.url).searchParams.get('postIds')
        const postIds = (postIdsParam ?? '')
            .split(',')
            .map((id) => id.trim())
            .filter(Boolean)

        if (postIds.length === 0) {
            return NextResponse.json({ data: [] })
        }

        const interactions = await getUserPostInteractions(userId, postIds)

        return NextResponse.json({ data: interactions })
    } catch (error) {
        console.error('Error in GET /api/users/[userId]/interactions:', error)
        return NextResponse.json(
            {
                error: 'Internal server error',
                message: error instanceof Error ? error.message : 'Failed to fetch user interactions'
            },
            { status: 500 }
        )
    }
}
