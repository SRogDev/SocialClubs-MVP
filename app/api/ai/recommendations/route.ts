/**
 * GET /api/ai/recommendations?clubId=...
 * Returns UI-ready structured recommendations for the current user, built
 * deterministically from member_signals + ai_drafts + ai_signals (no LLM).
 * Powers the SmartPanel dashboard widget (sentient UI, Phases 58-62).
 *
 * Auth: the requester must be logged in AND hold a club role in `clubId`
 * (member or above). Churn nudges are staff-only inside the engine.
 * Response expires client-side via each recommendation's `expiresAt`.
 */
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'

import { AuthorizationError, CLUB_ROLES, requireClubRole } from '@/lib/authz'
import { getRecommendations, supabaseRecommendationDb } from '@/lib/ai/ui-recommendations'
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

        // Authorize: requester must belong to the club (any role).
        const role = await requireClubRole(user.id, clubId, [...CLUB_ROLES])

        const recommendations = await getRecommendations(
            clubId,
            { userId: user.id, role },
            { db: supabaseRecommendationDb() },
        )
        return NextResponse.json({ data: recommendations })
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
        console.error('Error in GET /api/ai/recommendations:', error)
        return NextResponse.json(
            { error: 'Internal server error', message: 'Failed to load recommendations' },
            { status: 500 },
        )
    }
}
