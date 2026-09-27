import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server'
import { z } from 'zod'

import { enqueueRagIngestion } from '@/lib/rag-queue'
import { rateLimit, RATE_LIMITS, addRateLimitHeaders } from '@/lib/rate-limit'
import { createClient } from '@/lib/supabase/server'
import { runClubSqlTool, retrieveClubKnowledgeTool } from '@/services/agentToolsService'
import { createRagSource, deleteRagSource } from '@/services/ragService'

const mcpRequestSchema = z.object({
    method: z.enum(['panel.read', 'agent.chat.context', 'rag.manage.upload', 'rag.manage.delete', 'rag.manage.reindex']),
    params: z.object({}).catchall(z.any()).default({}),
})

export async function POST(request: NextRequest) {
    const limited = await rateLimit(request, RATE_LIMITS.QUERY)
    if (limited) return limited

    try {
        const supabase = await createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const parsed = mcpRequestSchema.safeParse(body)

        if (!parsed.success) {
            return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid MCP request' }, { status: 400 })
        }

        const { method, params } = parsed.data

        let result: unknown

        if (method === 'panel.read') {
            const clubId = z.string().uuid().parse(params.clubId)
            const queryName = z.enum(['club_profile', 'club_member_summary', 'user_membership_preferences']).parse(params.queryName)
            result = await runClubSqlTool(queryName, { clubId, userId: user.id })
        } else if (method === 'agent.chat.context') {
            const clubId = z.string().uuid().parse(params.clubId)
            const query = z.string().min(2).parse(params.query)
            result = await retrieveClubKnowledgeTool(clubId, query)
        } else if (method === 'rag.manage.upload') {
            const clubId = z.string().uuid().parse(params.clubId)
            const sourceName = z.string().min(1).max(255).parse(params.sourceName)
            const mimeType = z.string().min(3).max(120).parse(params.mimeType)
            const fileSizeBytes = z.number().int().positive().parse(params.fileSizeBytes)
            const storagePath = z.string().min(3).max(1024).parse(params.storagePath)
            const rawText = z.string().max(500000).optional().parse(params.rawText)

            const { data: club } = await supabase
                .from('clubs')
                .select('creator')
                .eq('id', clubId)
                .single()

            if (!club || club.creator !== user.id) {
                return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
            }

            const source = await createRagSource({
                clubId,
                uploadedBy: user.id,
                sourceName,
                mimeType,
                fileSizeBytes,
                storagePath: rawText ? `inline://${encodeURIComponent(rawText)}` : storagePath,
            })

            await enqueueRagIngestion({
                sourceId: source.id,
                clubId,
                requestedBy: user.id,
                triggeredAt: Date.now(),
            })

            result = { sourceId: source.id, queued: true }
        } else if (method === 'rag.manage.delete') {
            const clubId = z.string().uuid().parse(params.clubId)
            const sourceId = z.string().uuid().parse(params.sourceId)

            const { data: club } = await supabase
                .from('clubs')
                .select('creator')
                .eq('id', clubId)
                .single()

            if (!club || club.creator !== user.id) {
                return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
            }

            await deleteRagSource(sourceId)
            result = { deleted: true, sourceId }
        } else {
            const clubId = z.string().uuid().parse(params.clubId)
            const sourceId = z.string().uuid().parse(params.sourceId)

            const { data: club } = await supabase
                .from('clubs')
                .select('creator')
                .eq('id', clubId)
                .single()

            if (!club || club.creator !== user.id) {
                return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
            }

            const queued = await enqueueRagIngestion({
                sourceId,
                clubId,
                requestedBy: user.id,
                triggeredAt: Date.now(),
            })

            result = { reindexed: queued.enqueued, sourceId, reason: queued.reason }
        }

        const response = NextResponse.json({ ok: true, method, result })
        return addRateLimitHeaders(response, request)
    } catch (error) {
        console.error('[MCP API] error:', error)
        return NextResponse.json({ error: 'MCP execution failed' }, { status: 500 })
    }
}
