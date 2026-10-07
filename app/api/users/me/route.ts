/**
 * GET /api/users/me
 * Returns the profile of the currently authenticated user
 */
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/services/userService'

export async function GET(request: NextRequest) {
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

        const profile = await getCurrentUser()

        if (!profile) {
            return NextResponse.json({ error: 'Not found' }, { status: 404 })
        }

        return NextResponse.json({ data: profile })
    } catch (error) {
        console.error('Error in GET /api/users/me:', error)
        return NextResponse.json(
            {
                error: 'Internal server error',
                message: error instanceof Error ? error.message : 'Failed to fetch current user'
            },
            { status: 500 }
        )
    }
}
