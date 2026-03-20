import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { rateLimit, RATE_LIMITS, addRateLimitHeaders } from '@/lib/rate-limit'
import { ragUploadRequestSchema, ragIngestionJobSchema } from '@/schemas/ragSchema'
import { createRagSource } from '@/services/ragService'
import { enqueueRagIngestion } from '@/lib/rag-queue'

export async function POST(request: NextRequest) {
    const limited = await rateLimit(request, RATE_LIMITS.MUTATION)
    if (limited) return limited

    try {
        const supabase = await createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
        }

        const body = await request.json()
        const parsed = ragUploadRequestSchema.safeParse(body)
        if (!parsed.success) {
            return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Payload inválido' }, { status: 400 })
        }

        const { clubId, sourceName, mimeType, fileSizeBytes, storagePath, rawText } = parsed.data

        const { data: club } = await supabase
            .from('clubs')
            .select('creator')
            .eq('id', clubId)
            .single()

        if (!club || club.creator !== user.id) {
            return NextResponse.json({ error: 'No tienes permisos para subir RAG de este club' }, { status: 403 })
        }

        const source = await createRagSource({
            clubId,
            uploadedBy: user.id,
            sourceName,
            mimeType,
            fileSizeBytes,
            storagePath: rawText ? `inline://${encodeURIComponent(rawText)}` : storagePath,
        })

        const jobPayload = ragIngestionJobSchema.parse({
            sourceId: source.id,
            clubId,
            requestedBy: user.id,
            triggeredAt: Date.now(),
        })

        const enqueue = await enqueueRagIngestion(jobPayload)
        const response = NextResponse.json({
            success: true,
            sourceId: source.id,
            queued: enqueue.enqueued,
            queueReason: enqueue.reason,
        })

        return addRateLimitHeaders(response, request)
    } catch (error) {
        console.error('[RAG Upload] Error:', error)
        return NextResponse.json({ error: 'Error subiendo fuente RAG' }, { status: 500 })
    }
}
