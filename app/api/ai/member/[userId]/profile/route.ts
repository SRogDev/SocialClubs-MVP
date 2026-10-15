/**
 * GET /api/ai/member/[userId]/profile?clubId=...
 * Returns the aggregated relationship profile for a club member, built from
 * their club-scoped member_signals (interests, engagement trend, milestones,
 * last active). Powers future AI-staff personalization (Community Manager
 * drafts, AI Inbox replies).
 *
 * Auth: the requester must be logged in AND hold a club role in `clubId`
 * (member or above). Profiles are club-scoped — a requester can only see
 * profiles for clubs they belong to; signals never cross clubs.
 *
 * Member control: when the profile's owner opted out of personalization,
 * the profile comes back EMPTY (same shape as no-activity) — no
 * personalization leaks through this endpoint.
 */
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'

import { AuthorizationError, requireClubRole } from '@/lib/authz'
import { getMemberProfileWithConsent } from '@/lib/ai/member-control'
import { AIAgentError } from '@/lib/ai/types'
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit'
import { createClient } from '@/lib/supabase/server'

const querySchema = z.object({
    clubId: z.string().uuid('Invalid clubId'),
})

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ userId: string }> },
) {
    try {
        // Apply rate limiting
        const rateLimitResult = await rateLimit(request, RATE_LIMITS.QUERY)
        if (rateLimitResult) return rateLimitResult

        // Authenticate
        const supabase = await createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json(
                { error: 'Unauthorized', message: 'You must be logged in' },
                { status: 401 },
            )
        }

        // Validate query
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
        const { userId } = await params

        // Authorize: requester must belong to the club (any role).
        // getMemberProfileWithConsent itself is club-scoped and consent-aware
        // (personalization opt-out -> empty profile); this is the membership gate.
        await requireClubRole(user.id, clubId, ['owner', 'admin', 'moderator', 'member'])

        const profile = await getMemberProfileWithConsent(clubId, userId)
        return NextResponse.json({ data: profile })
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
                { error: 'Service unavailable', message: 'Profile store is not configured' },
                { status: 503 },
            )
        }
        console.error('Error in GET /api/ai/member/[userId]/profile:', error)
        return NextResponse.json(
            { error: 'Internal server error', message: 'Failed to load member profile' },
            { status: 500 },
        )
    }
}
