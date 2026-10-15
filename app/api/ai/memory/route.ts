/**
 * GET /api/ai/memory?clubId=<uuid>&agentId=<text>
 * List what an AI staff agent remembers for a club (Phases 63-66): the
 * learned memories distilled from creator corrections and praise.
 *
 * DELETE /api/ai/memory?id=<uuid>&clubId=<uuid>
 * Remove one memory — creator curation. The delete is scoped to `clubId`:
 * it only removes the memory when it belongs to that club.
 *
 * Auth: logged in + club owner/admin (requireClubRole). Memories are
 * club-scoped and never leave their club.
 */
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'

import { AuthorizationError, requireClubRole } from '@/lib/authz'
import { deleteMemory, getAgentMemories } from '@/lib/ai/memory'
import { AIAgentError } from '@/lib/ai/types'
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit'
import { createClient } from '@/lib/supabase/server'

const listQuerySchema = z.object({
    clubId: z.string().uuid('Invalid clubId'),
    agentId: z.string().trim().min(1, 'agentId is required').max(100),
})

const deleteQuerySchema = z.object({
    id: z.string().uuid('Invalid id'),
    clubId: z.string().uuid('Invalid clubId'),
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
            { error: 'Forbidden', message: 'You need an owner or admin role in this club' },
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
        const limited = await rateLimit(request, RATE_LIMITS.QUERY)
        if (limited) return limited

        const user = await currentUser(request)
        if (!user) {
            return NextResponse.json(
                { error: 'Unauthorized', message: 'You must be logged in' },
                { status: 401 },
            )
        }

        const parsed = listQuerySchema.safeParse({
            clubId: request.nextUrl.searchParams.get('clubId'),
            agentId: request.nextUrl.searchParams.get('agentId'),
        })
        if (!parsed.success) {
            return NextResponse.json(
                { error: 'Validation failed', message: 'clubId (uuid) and agentId are required' },
                { status: 400 },
            )
        }
        const { clubId, agentId } = parsed.data

        await requireClubRole(user.id, clubId, ['owner', 'admin'])

        const memories = await getAgentMemories(clubId, agentId)
        return NextResponse.json({ data: memories })
    } catch (error) {
        return forbidden(error) ?? dbUnavailable(error) ?? (() => {
            console.error('Error in GET /api/ai/memory:', error)
            return NextResponse.json(
                { error: 'Internal server error', message: 'Failed to list memories' },
                { status: 500 },
            )
        })()
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const limited = await rateLimit(request, RATE_LIMITS.MUTATION)
        if (limited) return limited

        const user = await currentUser(request)
        if (!user) {
            return NextResponse.json(
                { error: 'Unauthorized', message: 'You must be logged in' },
                { status: 401 },
            )
        }

        const parsed = deleteQuerySchema.safeParse({
            id: request.nextUrl.searchParams.get('id'),
            clubId: request.nextUrl.searchParams.get('clubId'),
        })
        if (!parsed.success) {
            return NextResponse.json(
                { error: 'Validation failed', message: 'id and clubId query params must be UUIDs' },
                { status: 400 },
            )
        }
        const { id, clubId } = parsed.data

        await requireClubRole(user.id, clubId, ['owner', 'admin'])

        const deleted = await deleteMemory(id, clubId)
        if (!deleted) {
            return NextResponse.json(
                { error: 'Not found', message: 'No memory with that id in this club' },
                { status: 404 },
            )
        }
        return NextResponse.json({ data: { id, deleted: true } })
    } catch (error) {
        return forbidden(error) ?? dbUnavailable(error) ?? (() => {
            console.error('Error in DELETE /api/ai/memory:', error)
            return NextResponse.json(
                { error: 'Internal server error', message: 'Failed to delete memory' },
                { status: 500 },
            )
        })()
    }
}
