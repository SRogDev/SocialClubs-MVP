/**
 * GET /api/users/[userId]/clubs
 * Returns the clubs a user is a member of
 */
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit'
import { createClient } from '@/lib/supabase/server'
import { getUserClubs } from '@/services/clubService'

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

        const clubs = await getUserClubs(userId)

        return NextResponse.json({ data: clubs })
    } catch (error) {
        console.error('Error in GET /api/users/[userId]/clubs:', error)
        return NextResponse.json(
            {
                error: 'Internal server error',
                message: error instanceof Error ? error.message : 'Failed to fetch user clubs'
            },
            { status: 500 }
        )
    }
}
