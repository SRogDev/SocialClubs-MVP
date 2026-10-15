/**
 * GET /api/ai/audit?clubId=<uuid>&limit=<n>
 *
 * Read-only transparency API over the `ai_actions` governance audit trail
 * (Phases 73-76, ADR-002 §5): every AI-staff action in the club — who
 * (agent), what (action + inputs), policy/review/execution results,
 * idempotency key, timestamps. Inputs are PII-sanitized on the way out.
 * Rows are written by the verification pipeline (`lib/ai/verify.ts`);
 * this endpoint never writes.
 *
 * Auth: logged in + club owner/admin. This is the read API for the same
 * log the AI Inbox shows — no separate store.
 */
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'

import { AuthorizationError, requireClubRole } from '@/lib/authz'
import { listAiActions } from '@/lib/ai/transparency'
import { AIAgentError } from '@/lib/ai/types'
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit'
import { createClient } from '@/lib/supabase/server'

const querySchema = z.object({
    clubId: z.string().uuid('Invalid clubId'),
    limit: z.coerce.number().int().min(1).max(200).optional(),
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
            limit: request.nextUrl.searchParams.get('limit') ?? undefined,
        })
        if (!parsed.success) {
            return NextResponse.json(
                { error: 'Validation failed', message: 'clubId query param must be a UUID' },
                { status: 400 },
            )
        }
        const { clubId, limit } = parsed.data

        await requireClubRole(user.id, clubId, ['owner', 'admin'])

        const actions = await listAiActions(clubId, undefined, limit ?? 100)
        return NextResponse.json({ data: actions })
    } catch (error) {
        if (error instanceof AuthorizationError) {
            const status = error.code === 'NOT_A_MEMBER' ? 404 : 403
            return NextResponse.json(
                { error: 'Forbidden', message: 'You need an owner or admin role in this club' },
                { status },
            )
        }
        if (error instanceof AIAgentError && error.code === 'AI_DB_UNAVAILABLE') {
            return NextResponse.json(
                { error: 'Service unavailable', message: 'AI store is not configured' },
                { status: 503 },
            )
        }
        console.error('Error in GET /api/ai/audit:', error)
        return NextResponse.json(
            { error: 'Internal server error', message: 'Failed to load AI audit log' },
            { status: 500 },
        )
    }
}
