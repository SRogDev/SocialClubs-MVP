/**
 * GET /api/ai/pulse?clubId=...
 * Returns the club "pulse" (active/steady/quiet) derived deterministically
 * from recent club-level signal activity (posts, joins, events) — no LLM.
 * Powers the ActivityPulse indicator (sentient UI, Phases 58-62).
 *
 * Auth: the requester must be logged in AND hold a club role in `clubId`
 * (member or above).
 */
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'

import { AuthorizationError, CLUB_ROLES, requireClubRole } from '@/lib/authz'
import { getPulse, supabaseRecommendationDb } from '@/lib/ai/ui-recommendations'
import { AIAgentError } from '@/lib/ai/types'
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit'
import { createClient } from '@/lib/supabase/server'

const querySchema = z.object({
    clubId: z.string().uuid('Invalid clubId'),
})

export async function GET(request: NextRequest) {
    try {
        const rateLimitResult = await rateLimit(request, RATE_LIMITS.QUERY)
        if (rateLimitResult) return rateLimitResult

        const supabase = await createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json(
                { error: 'Unauthorized', message: 'You must be logged in' },
                { status: 401 },
            )
        }

        const parsed = querySchema.safeParse({
            clubId: request.nextUrl.searchParams.get('clubId'),
        })
        if (!parsed.success) {
            return NextResponse.json(
                { error: 'Validation failed', message: 'clubId query param must be a UUID' },
                { status: 400 },
            )
        }
        const { clubId } = parsed.data

        await requireClubRole(user.id, clubId, [...CLUB_ROLES])

        const pulse = await getPulse(clubId, { db: supabaseRecommendationDb() })
        return NextResponse.json({ data: pulse })
    } catch (error) {
        if (error instanceof AuthorizationError) {
            const status = error.code === 'NOT_A_MEMBER' ? 404 : 403
            return NextResponse.json(
                { error: 'Forbidden', message: 'You are not a member of this club' },
                { status },
            )
        }
        if (error instanceof AIAgentError && error.code === 'AI_DB_UNAVAILABLE') {
            return NextResponse.json(
                { error: 'Service unavailable', message: 'Signal store is not configured' },
                { status: 503 },
            )
        }
        console.error('Error in GET /api/ai/pulse:', error)
        return NextResponse.json(
            { error: 'Internal server error', message: 'Failed to load club pulse' },
            { status: 500 },
        )
    }
}
