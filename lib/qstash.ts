/**
 * QStash Client - Message Publisher
 *
 * Publishes gamification events from server actions to the QStash queue.
 * QStash delivers the message to the worker endpoint with guaranteed delivery
 * and automatic retries (up to 3) on failure.
 *
 * Worker endpoint: POST /api/queues/gamification
 *
 * Usage pattern in server actions (fire-and-forget):
 *   enqueueGamificationEvent(payload)
 *     .catch(err => console.error('[action] QStash enqueue failed:', err))
 */
import { Client } from '@upstash/qstash'

import type { GamificationActionType } from '@/types/gamification'

if (!process.env.QSTASH_TOKEN) {
    throw new Error('QSTASH_TOKEN is not set')
}

export const qstashClient = new Client({
    token: process.env.QSTASH_TOKEN,
})

export interface GamificationJobPayload {
    userId: string
    clubId: string
    actionType: GamificationActionType
    metadata?: Record<string, unknown>
    triggeredAt: number // Unix ms — used for ordering and dedup
}

/**
 * Enqueue a gamification point-award event.
 *
 * Call this from server actions WITHOUT await so it doesn't block the response.
 * QStash handles retries if the worker fails.
 *
 * @example
 * enqueueGamificationEvent({ userId, clubId, actionType: 'like_given', metadata: { postId }, triggeredAt: Date.now() })
 *   .catch(err => console.error('[postActions] QStash enqueue failed:', err))
 */
export async function enqueueGamificationEvent(
    payload: GamificationJobPayload
): Promise<void> {
    const baseUrl =
        process.env.NEXT_PUBLIC_SITE_URL ??
        (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null)

    if (!baseUrl) {
        console.error('[QStash] NEXT_PUBLIC_SITE_URL is not set — cannot enqueue')
        return
    }

    await qstashClient.publishJSON({
        url: `${baseUrl}/api/queues/gamification`,
        body: payload,
        retries: 3,
    })
}
