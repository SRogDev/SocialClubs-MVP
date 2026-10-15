/**
 * GET /api/ai/moderation/events?clubId=...
 * Lists the moderation event audit log for a club, newest first. This is the
 * read surface for the future moderation queue UI (AI Inbox): rows with
 * action_taken 'flagged_for_review' or 'hide_proposed' are the pending
 * drafts awaiting a human decision.
 *
 * Auth: the requester must be logged in AND hold a staff club role
 * (owner/admin/moderator). `moderation_events` RLS is service-role only,
 * so the route is the only read path — the role check here is the gate.
 */
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'

import { AuthorizationError, requireClubRole } from '@/lib/authz'
import { AIAgentError } from '@/lib/ai/types'
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit'
import { createClient } from '@/lib/supabase/server'

const querySchema = z.object({
    clubId: z.string().uuid('Invalid clubId'),
    limit: z.coerce.number().int().min(1).max(200).default(100),
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
            limit: request.nextUrl.searchParams.get('limit') ?? undefined,
        })
        if (!parsed.success) {
            return NextResponse.json(
                { error: 'Validation failed', message: 'clubId query param must be a UUID' },
                { status: 400 },
            )
        }
        const { clubId, limit } = parsed.data

        // Authorize: staff roles only — moderation decisions are staff business.
        await requireClubRole(user.id, clubId, ['owner', 'admin', 'moderator'])

        const { data: events, error } = await supabase
            .from('moderation_events')
            .select('*')
            .eq('club_id', clubId)
            .order('created_at', { ascending: false })
            .limit(limit)

        if (error) {
            // The table may not exist yet if the migration hasn't been applied.
            if (error.code === '42P01') {
                return NextResponse.json({ data: [] })
            }
            throw error
        }

        return NextResponse.json({ data: events ?? [] })
    } catch (error) {
        if (error instanceof AuthorizationError) {
            const status = error.code === 'NOT_A_MEMBER' ? 404 : 403
            return NextResponse.json(
                { error: 'Forbidden', message: 'You need a staff role in this club' },
                { status },
            )
        }
        if (error instanceof AIAgentError && error.code === 'AI_DB_UNAVAILABLE') {
            return NextResponse.json(
                { error: 'Service unavailable', message: 'Moderation store is not configured' },
                { status: 503 },
            )
        }
        console.error('Error in GET /api/ai/moderation/events:', error)
        return NextResponse.json(
            { error: 'Internal server error', message: 'Failed to load moderation events' },
            { status: 500 },
        )
    }
}
