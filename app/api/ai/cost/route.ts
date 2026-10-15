/**
 * GET /api/ai/cost?clubId=...&month=YYYY-MM
 * AI cost dashboard data for a club: current-month spend (totals, by agent,
 * by workflow) plus budget status (cap vs spent, % used, projected overrun).
 *
 * Auth: the requester must be logged in AND hold an owner/admin club role.
 * `ai_usage` / `ai_budgets` RLS is service-role only, so the route is the
 * only read path — the role check here is the gate.
 */
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'

import { AuthorizationError, requireClubRole } from '@/lib/authz'
import { AIAgentError } from '@/lib/ai/types'
import { supabaseCostDb } from '@/lib/ai/cost'
import { getBudgetStatus, getClubSpend } from '@/lib/ai/cost-dashboard'
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit'
import { createClient } from '@/lib/supabase/server'

const querySchema = z.object({
    clubId: z.string().uuid('Invalid clubId'),
    month: z
        .string()
        .regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'month must be YYYY-MM')
        .optional(),
})

function currentMonth(): string {
    const now = new Date()
    return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`
}

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
            month: request.nextUrl.searchParams.get('month') ?? undefined,
        })
        if (!parsed.success) {
            return NextResponse.json(
                { error: 'Validation failed', message: parsed.error.issues[0]?.message ?? 'Invalid query' },
                { status: 400 },
            )
        }
        const { clubId } = parsed.data
        const month = parsed.data.month ?? currentMonth()

        // Authorize: owner/admin only — cost data is club-owner business.
        await requireClubRole(user.id, clubId, ['owner', 'admin'])

        const deps = { db: supabaseCostDb() }
        const [spend, budget] = await Promise.all([
            getClubSpend(clubId, month, deps),
            getBudgetStatus(clubId, deps),
        ])

        return NextResponse.json({
            clubId,
            month,
            spend,
            budget,
            note: 'Los costos de IA están incluidos en el margen de la plataforma.',
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
        console.error('[api/ai/cost]', err)
        return NextResponse.json(
            { error: 'Internal error', message: 'Failed to load AI cost data' },
            { status: 500 },
        )
    }
}
