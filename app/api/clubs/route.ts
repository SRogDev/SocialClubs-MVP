/**
 * API Route: Create Club
 * POST /api/clubs
 */

import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server'

import { rateLimit, RATE_LIMITS, addRateLimitHeaders } from '@/lib/rate-limit'
import { createClient } from '@/lib/supabase/server'
import { createClubSchema } from '@/schemas/clubSchema'
import { createClub, getClubs } from '@/services/clubService'

/**
 * GET /api/clubs
 * Returns all clubs, newest first
 */
export async function GET(request: NextRequest) {
    try {
        // Apply rate limiting
        const rateLimitResult = await rateLimit(request, RATE_LIMITS.QUERY)
        if (rateLimitResult) return rateLimitResult

        const clubs = await getClubs()

        return NextResponse.json({ data: clubs })
    } catch (error) {
        console.error('Error in GET /api/clubs:', error)
        return NextResponse.json(
            {
                error: 'Internal server error',
                message: error instanceof Error ? error.message : 'Failed to fetch clubs'
            },
            { status: 500 }
        )
    }
}

export async function POST(request: NextRequest) {
    try {
        // Apply rate limiting
        const rateLimitResult = await rateLimit(request, RATE_LIMITS.MUTATION)
        if (rateLimitResult) return rateLimitResult

        // Get authenticated user
        const supabase = await createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return NextResponse.json(
                { error: 'Unauthorized', message: 'You must be logged in to create a club' },
                { status: 401 }
            )
        }

        // Parse and validate request body
        const body = await request.json()

        // Validate with Zod schema
        const validationResult = createClubSchema.safeParse(body)
        if (!validationResult.success) {
            return NextResponse.json(
                {
                    error: 'Validation failed',
                    message: 'Invalid club data',
                    details: validationResult.error.issues
                },
                { status: 400 }
            )
        }

        // Create club using service
        const club = await createClub(validationResult.data, user.id)

        // Create response with rate limit headers
        const response = NextResponse.json(
            {
                success: true,
                data: club,
                message: 'Club created successfully'
            },
            { status: 200 }
        )

        return addRateLimitHeaders(response, request)

    } catch (error) {
        console.error('Error in POST /api/clubs:', error)

        return NextResponse.json(
            {
                error: 'Internal server error',
                message: error instanceof Error ? error.message : 'Failed to create club'
            },
            { status: 500 }
        )
    }
}
