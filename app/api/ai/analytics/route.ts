/**
 * GET /api/ai/analytics?clubId=...&days=30
 * AI staff analytics for a club: staff health, action stats + funnel, and
 * engagement-impact correlations.
 *
 * Auth: the requester must be logged in AND hold an owner/admin club role.
 * The underlying tables (ai_actions, ai_action_reviews, ai_usage,
 * ai_signals) are service-role only, so the route is the only read path —
 * the role check here is the gate.
 */
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'

import { getClubAnalytics, supabaseAnalyticsDb } from '@/lib/ai/analytics'
import { AIAgentError } from '@/lib/ai/types'
import { AuthorizationError, requireClubRole } from '@/lib/authz'
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit'
import { createClient } from '@/lib/supabase/server'

const querySchema = z.object({
    clubId: z.string().uuid('Invalid clubId'),
    days: z
        .coerce
        .number()
        .int()
        .min(1)
        .max(90)
        .optional(),
})

export async function GET(request: NextRequest) {
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
            days: request.nextUrl.searchParams.get('days') ?? undefined,
        })
        if (!parsed.success) {
            return NextResponse.json(
                { error: 'Validation failed', message: parsed.error.issues[0]?.message ?? 'Invalid query' },
                { status: 400 },
            )
        }
        const { clubId } = parsed.data
        const days = parsed.data.days ?? 30

        // Authorize: owner/admin only — staff analytics are club-owner business.
        await requireClubRole(user.id, clubId, ['owner', 'admin'])

        const analytics = await getClubAnalytics(clubId, days, {
            db: supabaseAnalyticsDb(),
        })

        return NextResponse.json({
            ...analytics,
            honesty: 'Las correlaciones de impacto son correlaciones, no causas. ' +
                'Las latencias medias provienen de las llamadas LLM registradas en ai_usage.',
        })
    } catch (err) {
        if (err instanceof AuthorizationError) {
            return NextResponse.json(
                { error: 'Forbidden', message: err.message },
                { status: 403 },
            )
        }
        if (err instanceof AIAgentError) {
            return NextResponse.json(
                { error: err.code, message: err.message },
                { status: 502 },
            )
        }
        console.error('[api/ai/analytics]', err)
        return NextResponse.json(
            { error: 'Internal error', message: 'Failed to load AI analytics' },
            { status: 500 },
        )
    }
}
