import { qstashClient } from '@/lib/qstash'
import { redis } from '@/lib/redis'
import type { RagIngestionJobPayload } from '@/schemas/ragSchema'

function getBaseUrl(): string | null {
    return (
        process.env.NEXT_PUBLIC_SITE_URL ??
        (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null)
    )
}

export async function enqueueRagIngestion(payload: RagIngestionJobPayload): Promise<{ enqueued: boolean; reason?: string }> {
    const dedupKey = `rag:job:${payload.sourceId}`
    const lock = await redis.set(dedupKey, '1', { nx: true, ex: 300 })

    if (lock !== 'OK') {
        return { enqueued: false, reason: 'Job already queued recently' }
    }

    const baseUrl = getBaseUrl()
    if (!baseUrl) {
        await redis.del(dedupKey)
        return { enqueued: false, reason: 'NEXT_PUBLIC_SITE_URL or VERCEL_URL is required' }
    }

    await qstashClient.publishJSON({
        url: `${baseUrl}/api/queues/rag-ingestion`,
        body: payload,
        retries: 3,
    })

    return { enqueued: true }
}
