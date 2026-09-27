/**
 * API Route: Delete Club
 * DELETE /api/clubs/[id]
 */

import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server'

import { rateLimit, RATE_LIMITS, addRateLimitHeaders } from '@/lib/rate-limit'
import { createClient } from '@/lib/supabase/server'
import { deleteClub, getClubById } from '@/services/clubService'

export async function DELETE(
    request: NextRequest,
    context: RouteContext<'/api/clubs/[id]'>
) {
    try {
        // Apply rate limiting
        const rateLimitResult = await rateLimit(request, RATE_LIMITS.MUTATION)
        if (rateLimitResult) return rateLimitResult

        // Get authenticated user
        const supabase = await createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return NextResponse.json(
                { error: 'Unauthorized', message: 'You must be logged in to delete a club' },
                { status: 401 }
            )
        }

        // Get club ID from params
        const { id } = await context.params

        if (!id) {
            return NextResponse.json(
                { error: 'Bad request', message: 'Club ID is required' },
                { status: 400 }
            )
        }

        // Check if club exists and user is the creator
        const club = await getClubById(id)

        if (!club) {
            return NextResponse.json(
                { error: 'Not found', message: 'Club not found' },
                { status: 404 }
            )
        }

        // Verify user is the creator of the club
        if (club.creator !== user.id) {
            return NextResponse.json(
                {
                    error: 'Forbidden',
                    message: 'Only the club creator can delete this club'
                },
                { status: 403 }
            )
        }

        // Delete club using service
        await deleteClub(id)

        // Create response with rate limit headers
        const response = NextResponse.json(
            {
                success: true,
                message: 'Club deleted successfully',
                data: { id }
            },
            { status: 200 }
        )

        return addRateLimitHeaders(response, request)

    } catch (error) {
        console.error('Error in DELETE /api/clubs/[id]:', error)

        return NextResponse.json(
            {
                error: 'Internal server error',
                message: error instanceof Error ? error.message : 'Failed to delete club'
            },
            { status: 500 }
        )
    }
}
