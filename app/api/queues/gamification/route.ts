/**
 * QStash Worker: Gamification Point Awards
 * POST /api/queues/gamification
 *
 * Called BY QStash (never directly by the browser).
 * Verifies the HMAC signature, awards points, and invalidates the leaderboard cache.
 *
 * Return codes:
 *   200 → success or permanently invalid payload (no retry)
 *   401 → bad signature (QStash will NOT retry — signature failures are permanent)
 *   500 → transient error (QStash retries up to 3 times with exponential backoff)
 */
import { NextRequest, NextResponse } from 'next/server'
import { Receiver } from '@upstash/qstash'
import { awardPoints } from '@/services/gamificationService'
import { invalidateLeaderboardCache } from '@/lib/leaderboard-cache'
import type { GamificationJobPayload } from '@/lib/qstash'

// Node.js runtime — awardPoints uses createClient() which calls cookies()
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
    // 1. Read raw body before parsing (required for HMAC verification)
    let body: string
    try {
        body = await request.text()
    } catch {
        return NextResponse.json({ error: 'Could not read body' }, { status: 400 })
    }

    // 2. Verify QStash HMAC signature
    try {
        const receiver = getReceiver()
        const isValid = await receiver.verify({
            signature: request.headers.get('upstash-signature') ?? '',
            body,
        })
        if (!isValid) {
            console.error('[QStash Worker] Invalid signature')
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }
    } catch (err) {
        console.error('[QStash Worker] Signature verification error:', err)
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 3. Parse and validate payload
    let payload: GamificationJobPayload
    try {
        payload = JSON.parse(body) as GamificationJobPayload
    } catch {
        // Malformed JSON — return 200 to prevent infinite retries
        console.error('[QStash Worker] Invalid JSON payload')
        return NextResponse.json({ error: 'Invalid JSON' }, { status: 200 })
    }

    if (!payload.userId || !payload.clubId || !payload.actionType) {
        // Missing required fields — permanent failure, return 200 to stop retries
        console.error('[QStash Worker] Malformed payload:', payload)
        return NextResponse.json({ error: 'Malformed payload' }, { status: 200 })
    }

    // 4. Award points
    try {
        await awardPoints({
            userId: payload.userId,
            clubId: payload.clubId,
            actionType: payload.actionType,
            metadata: payload.metadata,
        })

        // 5. Invalidate leaderboard cache so next read is fresh
        await invalidateLeaderboardCache(payload.clubId)

        console.log(
            `[QStash Worker] ✓ user=${payload.userId} action=${payload.actionType} club=${payload.clubId}`
        )

        return NextResponse.json({ ok: true })
    } catch (err) {
        // Transient error — return 500 so QStash retries
        console.error('[QStash Worker] awardPoints failed:', err)
        return NextResponse.json({ error: 'Processing failed' }, { status: 500 })
    }
}
