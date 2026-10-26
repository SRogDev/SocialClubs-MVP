/**
 * POST /api/ai/knowledge/rebuild  { clubId }
 *
 * Rebuild a club's derived knowledge index (Supermemory namespace
 * `club_<clubId>`) from the Supabase source of truth: the namespace is
 * wiped and every source document (FAQ, club profile, knowledge
 * corrections) is re-ingested. This is the migration/exit primitive from
 * docs/MEMORY_INFRASTRUCTURE.md — switching memory backends means
 * pointing the provider at the new backend and rebuilding every club.
 *
 * Auth: logged in + owner/admin club role. When Supermemory is not
 * configured (no SUPERMEMORY_API_KEY) the rebuild is a reported no-op
 * ({ skipped: true }) — the source of truth is unaffected either way.
 */
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'

import { rebuildClubKnowledge } from '@/lib/ai/knowledge'
import { AuthorizationError, requireClubRole } from '@/lib/authz'
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit'
import { createClient } from '@/lib/supabase/server'

const bodySchema = z.object({
    clubId: z.string().uuid('Invalid clubId'),
})

export async function POST(request: NextRequest) {
    try {
        const rateLimitResult = await rateLimit(request, RATE_LIMITS.MUTATION)
        if (rateLimitResult) return rateLimitResult

        const supabase = await createClient()
        const {
            data: { user },
            error: authError,
        } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json(
                { error: 'Unauthorized', message: 'You must be logged in' },
                { status: 401 },
            )
        }

        const parsed = bodySchema.safeParse(await request.json().catch(() => null))
        if (!parsed.success) {
            return NextResponse.json(
                {
                    error: 'Validation failed',
                    message: parsed.error.issues[0]?.message ?? 'Invalid body',
                },
                { status: 400 },
            )
        }
        const { clubId } = parsed.data

        // Authorize: rebuilding the club's knowledge index is owner business.
        await requireClubRole(user.id, clubId, ['owner', 'admin'])

        const result = await rebuildClubKnowledge(clubId)
        return NextResponse.json({
            success: true,
            clubId,
            skipped: result.skipped,
            ingested: result.ingested,
            message: result.skipped
                ? 'Supermemory no está configurado en este servidor; la fuente de verdad (Supabase) no se ve afectada.'
                : 'Índice de conocimiento del club reconstruido desde Supabase.',
        })
    } catch (err) {
        if (err instanceof AuthorizationError) {
            return NextResponse.json(
                { error: 'Forbidden', message: err.message },
                { status: 403 },
            )
        }
        console.error('[api/ai/knowledge/rebuild] error:', err)
        return NextResponse.json(
            { error: 'Internal error', message: 'No se pudo reconstruir el índice de conocimiento.' },
            { status: 500 },
        )
    }
}
