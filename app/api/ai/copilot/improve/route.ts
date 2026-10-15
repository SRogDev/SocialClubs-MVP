/**
 * POST /api/ai/copilot/improve
 * Creator Copilot: rewrite the creator's text for clarity and engagement,
 * returning the improved version plus the list of changes for review.
 *
 * DRAFTS ONLY — the original is never modified in place; the creator keeps
 * both versions and publishes manually.
 *
 * Auth: logged in + club owner/admin (requireClubRole). The club's AI
 * budget is enforced before the model call (HTTP 402 when exhausted).
 */
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'

import { AuthorizationError, requireClubRole } from '@/lib/authz'
import { improvePost } from '@/lib/ai/creator-copilot'
import { AIAgentError } from '@/lib/ai/types'
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit'
import { createClient } from '@/lib/supabase/server'

const bodySchema = z.object({
    clubId: z.string().uuid('Invalid clubId'),
    content: z.string().trim().min(1, 'Content is required').max(5000),
})

export async function POST(request: NextRequest) {
    try {
        const rateLimitResult = await rateLimit(request, RATE_LIMITS.MUTATION)
        if (rateLimitResult) return rateLimitResult

        const supabase = await createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json(
                { error: 'Unauthorized', message: 'You must be logged in' },
                { status: 401 },
            )
        }

        const parsed = bodySchema.safeParse(await request.json())
        if (!parsed.success) {
            return NextResponse.json(
                {
                    error: 'Validation failed',
                    message: parsed.error.issues.map((i) => i.message).join('; '),
                },
                { status: 400 },
            )
        }
        const { clubId, content } = parsed.data

        // Authorize: creators only (owner/admin) — drafts are staff business.
        await requireClubRole(user.id, clubId, ['owner', 'admin'])

        const result = await improvePost(content, clubId)

        return NextResponse.json({
            data: {
                improved: result.output.improved,
                changes: result.output.changes,
                mock: result.trace.mock,
                model: result.trace.model,
                latencyMs: result.trace.latencyMs,
            },
        })
    } catch (error) {
        if (error instanceof AuthorizationError) {
            const status = error.code === 'NOT_A_MEMBER' ? 404 : 403
            return NextResponse.json(
                { error: 'Forbidden', message: 'You need an owner or admin role in this club' },
                { status },
            )
        }
        if (error instanceof AIAgentError) {
            switch (error.code) {
                case 'AI_BUDGET_EXCEEDED':
                    return NextResponse.json(
                        { error: 'Budget exceeded', message: error.message, code: error.code },
                        { status: 402 },
                    )
                case 'AI_FLAG_DISABLED':
                    return NextResponse.json(
                        { error: 'Unavailable', message: 'Creator Copilot is disabled', code: error.code },
                        { status: 503 },
                    )
                case 'AI_DB_UNAVAILABLE':
                    return NextResponse.json(
                        { error: 'Service unavailable', message: 'AI store is not configured', code: error.code },
                        { status: 503 },
                    )
                case 'AI_OUTPUT_INVALID':
                    return NextResponse.json(
                        { error: 'Bad gateway', message: 'The AI returned an invalid rewrite', code: error.code },
                        { status: 502 },
                    )
                default:
                    break
            }
        }
        console.error('Error in POST /api/ai/copilot/improve:', error)
        return NextResponse.json(
            { error: 'Internal server error', message: 'Failed to improve the text' },
            { status: 500 },
        )
    }
}
