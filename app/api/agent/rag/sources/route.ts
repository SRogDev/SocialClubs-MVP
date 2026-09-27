import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server'

import { enqueueRagIngestion } from '@/lib/rag-queue'
import { rateLimit, RATE_LIMITS, addRateLimitHeaders } from '@/lib/rate-limit'
import { createClient } from '@/lib/supabase/server'
import { deleteRagSource } from '@/services/ragService'

export async function GET(request: NextRequest) {
    const limited = await rateLimit(request, RATE_LIMITS.READ)
    if (limited) return limited

    try {
        const supabase = await createClient()
        const { searchParams } = new URL(request.url)
        const clubId = searchParams.get('clubId')

        if (!clubId) {
            return NextResponse.json({ error: 'clubId es requerido' }, { status: 400 })
        }

        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
        }

        const { data: membership } = await supabase
            .from('users_clubs')
            .select('id')
            .eq('club_id', clubId)
            .eq('user_id', user.id)
            .single()

        if (!membership) {
            return NextResponse.json({ error: 'No eres miembro de este club' }, { status: 403 })
        }

        const { data, error } = await supabase
            .from('club_rag_sources')
            .select('id, source_name, mime_type, file_size_bytes, status, created_at, updated_at')
            .eq('club_id', clubId)
            .order('created_at', { ascending: false })

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        const response = NextResponse.json({ sources: data ?? [] })
        return addRateLimitHeaders(response, request)
    } catch (error) {
        console.error('[RAG Sources] Error:', error)
        return NextResponse.json({ error: 'Error listando fuentes RAG' }, { status: 500 })
    }
}

export async function DELETE(request: NextRequest) {
    const limited = await rateLimit(request, RATE_LIMITS.MUTATION)
    if (limited) return limited

    try {
        const supabase = await createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
        }

        const { sourceId, clubId } = await request.json()
        if (!sourceId || !clubId) {
            return NextResponse.json({ error: 'sourceId y clubId son requeridos' }, { status: 400 })
        }

        const { data: club } = await supabase
            .from('clubs')
            .select('creator')
            .eq('id', clubId)
            .single()

        if (!club || club.creator !== user.id) {
            return NextResponse.json({ error: 'No tienes permisos para borrar esta fuente RAG' }, { status: 403 })
        }

        await deleteRagSource(sourceId)
        const response = NextResponse.json({ success: true })
        return addRateLimitHeaders(response, request)
    } catch (error) {
        console.error('[RAG Sources DELETE] Error:', error)
        return NextResponse.json({ error: 'Error eliminando fuente RAG' }, { status: 500 })
    }
}

export async function POST(request: NextRequest) {
    const limited = await rateLimit(request, RATE_LIMITS.MUTATION)
    if (limited) return limited

    try {
        const supabase = await createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
        }

        const { sourceId, clubId } = await request.json()
        if (!sourceId || !clubId) {
            return NextResponse.json({ error: 'sourceId y clubId son requeridos' }, { status: 400 })
        }

        const { data: club } = await supabase
            .from('clubs')
            .select('creator')
            .eq('id', clubId)
            .single()

        if (!club || club.creator !== user.id) {
            return NextResponse.json({ error: 'No tienes permisos para reindexar esta fuente RAG' }, { status: 403 })
        }

        const enqueue = await enqueueRagIngestion({
            sourceId,
            clubId,
            requestedBy: user.id,
            triggeredAt: Date.now(),
        })

        const response = NextResponse.json({ success: true, queued: enqueue.enqueued, reason: enqueue.reason })
        return addRateLimitHeaders(response, request)
    } catch (error) {
        console.error('[RAG Sources POST reindex] Error:', error)
        return NextResponse.json({ error: 'Error reindexando fuente RAG' }, { status: 500 })
    }
}
