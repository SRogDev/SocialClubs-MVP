import { NextRequest, NextResponse } from 'next/server'
import { Receiver } from '@upstash/qstash'
import { ragIngestionJobSchema } from '@/schemas/ragSchema'
import { processRagIngestion } from '@/services/ragService'
import { redis } from '@/lib/redis'

export const runtime = 'nodejs'

function getReceiver() {
    if (!process.env.QSTASH_CURRENT_SIGNING_KEY) {
        throw new Error('QSTASH_CURRENT_SIGNING_KEY is not set')
    }
    if (!process.env.QSTASH_NEXT_SIGNING_KEY) {
        throw new Error('QSTASH_NEXT_SIGNING_KEY is not set')
    }

    return new Receiver({
        currentSigningKey: process.env.QSTASH_CURRENT_SIGNING_KEY,
        nextSigningKey: process.env.QSTASH_NEXT_SIGNING_KEY,
    })
}

export async function POST(request: NextRequest) {
    let body = ''

    try {
        body = await request.text()
    } catch {
        return NextResponse.json({ error: 'Could not read body' }, { status: 400 })
    }

    try {
        const receiver = getReceiver()
        const isValid = await receiver.verify({
            signature: request.headers.get('upstash-signature') ?? '',
            body,
        })

        if (!isValid) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }
    } catch (error) {
        console.error('[RAG Worker] Signature verification error:', error)
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let payloadJson: unknown
    try {
        payloadJson = JSON.parse(body)
    } catch {
        return NextResponse.json({ error: 'Invalid JSON' }, { status: 200 })
    }
    const parsed = ragIngestionJobSchema.safeParse(payloadJson)

    if (!parsed.success) {
        return NextResponse.json({ error: 'Malformed payload' }, { status: 200 })
    }

    const payload = parsed.data

    try {
        await processRagIngestion(payload.sourceId)
        await redis.del(`rag:job:${payload.sourceId}`)
        return NextResponse.json({ ok: true })
    } catch (error) {
        console.error('[RAG Worker] processing failed:', error)
        return NextResponse.json({ error: 'Processing failed' }, { status: 500 })
    }
}
