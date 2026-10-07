/**
 * GET /api/users/username/[username]
 * Returns a user profile by username
 */
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit'
import { getUserByUsername } from '@/services/userService'

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ username: string }> }
) {
    try {
        // Apply rate limiting
        const rateLimitResult = await rateLimit(request, RATE_LIMITS.QUERY)
        if (rateLimitResult) return rateLimitResult

        const { username } = await params

        if (!username) {
            return NextResponse.json(
                { error: 'Bad request', message: 'Username is required' },
                { status: 400 }
            )
        }

        const user = await getUserByUsername(username)

        if (!user) {
            return NextResponse.json({ error: 'Not found' }, { status: 404 })
        }

        return NextResponse.json({ data: user })
    } catch (error) {
        console.error('Error in GET /api/users/username/[username]:', error)
        return NextResponse.json(
            {
                error: 'Internal server error',
                message: error instanceof Error ? error.message : 'Failed to fetch user'
            },
            { status: 500 }
        )
    }
}
