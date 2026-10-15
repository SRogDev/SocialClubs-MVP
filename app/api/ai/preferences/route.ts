/**
 * GET /api/ai/preferences?clubId=<uuid>
 * PUT /api/ai/preferences  { clubId, allowPersonalization?, allowProactiveMessages? }
 *
 * The member's own AI consent switches for a club (Phases 73-76):
 * - allowPersonalization=false -> the AI staff builds no member profile
 *   and writes only general, non-personalized content for them.
 * - allowProactiveMessages=false -> workflows skip proactive
 *   sends/notifications to them.
 *
 * Defaults are opt-IN (both true). A member can only read/change THEIR OWN
 * preferences; they must belong to the club (member or above).
 */
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'

import { AuthorizationError, requireClubRole } from '@/lib/authz'
import {
    getMemberPreferences,
    setMemberPreferences,
} from '@/lib/ai/member-control'
import { AIAgentError } from '@/lib/ai/types'
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit'
import { createClient } from '@/lib/supabase/server'

const querySchema = z.object({
    clubId: z.string().uuid('Invalid clubId'),
})

const bodySchema = z.object({
    clubId: z.string().uuid('Invalid clubId'),
    allowPersonalization: z.boolean().optional(),
    allowProactiveMessages: z.boolean().optional(),
})

async function currentUser(request: NextRequest) {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return null
    return user
}

function forbidden(error: unknown) {
    if (error instanceof AuthorizationError) {
        const status = error.code === 'NOT_A_MEMBER' ? 404 : 403
        return NextResponse.json(
            { error: 'Forbidden', message: 'You are not a member of this club' },
            { status },
        )
    }
    return null
}

function dbUnavailable(error: unknown) {
    if (error instanceof AIAgentError && error.code === 'AI_DB_UNAVAILABLE') {
        return NextResponse.json(
            { error: 'Service unavailable', message: 'AI store is not configured' },
            { status: 503 },
        )
    }
    return null
}

export async function GET(request: NextRequest) {
    try {
        const rateLimitResult = await rateLimit(request, RATE_LIMITS.QUERY)
        if (rateLimitResult) return rateLimitResult

        const user = await currentUser(request)
        if (!user) {
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

        await requireClubRole(user.id, clubId, ['owner', 'admin', 'moderator', 'member'])

        const prefs = await getMemberPreferences(user.id, clubId)
        return NextResponse.json({ data: prefs })
    } catch (error) {
        return forbidden(error) ?? dbUnavailable(error) ?? (() => {
            console.error('Error in GET /api/ai/preferences:', error)
            return NextResponse.json(
                { error: 'Internal server error', message: 'Failed to load AI preferences' },
                { status: 500 },
            )
        })()
    }
}

export async function PUT(request: NextRequest) {
    try {
        const rateLimitResult = await rateLimit(request, RATE_LIMITS.MUTATION)
        if (rateLimitResult) return rateLimitResult

        const user = await currentUser(request)
        if (!user) {
            return NextResponse.json(
                { error: 'Unauthorized', message: 'You must be logged in' },
                { status: 401 },
            )
        }

        const json = await request.json().catch(() => null)
        const parsed = bodySchema.safeParse(json)
        if (!parsed.success) {
            return NextResponse.json(
                { error: 'Validation failed', message: 'Body must contain a valid clubId and boolean flags' },
                { status: 400 },
            )
        }
        const { clubId, allowPersonalization, allowProactiveMessages } = parsed.data

        await requireClubRole(user.id, clubId, ['owner', 'admin', 'moderator', 'member'])

        const prefs = await setMemberPreferences(user.id, clubId, {
            allowPersonalization,
            allowProactiveMessages,
        })
        return NextResponse.json({ data: prefs })
    } catch (error) {
        return forbidden(error) ?? dbUnavailable(error) ?? (() => {
            console.error('Error in PUT /api/ai/preferences:', error)
            return NextResponse.json(
                { error: 'Internal server error', message: 'Failed to save AI preferences' },
                { status: 500 },
            )
        })()
    }
}
