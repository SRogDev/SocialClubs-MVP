/**
 * QStash Worker: AI Signal Processing
 * POST /api/queues/ai-signals
 *
 * Called BY QStash (never directly by the browser).
 * Verifies the QStash HMAC signature, loads the persisted signal from
 * `ai_signals`, routes it to the right staff agent (SIGNAL_ROUTING), and
 * runs the agent's chosen action through the governance pipeline
 * (`verifyAndExecute`). At proactivity L1 every signal action lands as a
 * DRAFT for the AI Inbox — nothing is ever auto-sent from here.
 *
 * Return codes:
 *   200 → success or permanently invalid payload (no retry)
 *   401 → bad signature / bad internal secret (QStash will NOT retry)
 *   500 → transient error (QStash retries up to 3 times with exponential backoff)
 */
import { Receiver } from '@upstash/qstash'
import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server'

import { AGENTS } from '@/lib/ai/agents'
import {
    getSignalById,
    markSignalProcessed,
    SIGNAL_ROUTING,
    supabaseSignalDb,
} from '@/lib/ai/signals'
import { supabaseVerifyDb, verifyAndExecute } from '@/lib/ai/verify'
import { requireInternalWorker } from '@/lib/authz'

// Node.js runtime — verify.ts uses node:crypto and the service-role client.

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

interface SignalWorkerPayload {
    signalId?: unknown
}

type AuthResult =
    | { ok: true; payload: SignalWorkerPayload }
    | { ok: false; response: NextResponse }

/**
 * Steps 1-4: read the raw body, verify the QStash HMAC signature, check the
 * internal worker secret, and parse/validate the payload. Returns the error
 * response directly when the request must be rejected.
 */
async function authenticateAndParse(request: NextRequest): Promise<AuthResult> {
    // 1. Read raw body before parsing (required for HMAC verification)
    let body: string
    try {
        body = await request.text()
    } catch {
        return { ok: false, response: NextResponse.json({ error: 'Could not read body' }, { status: 400 }) }
    }

    // 2. Verify QStash HMAC signature
    try {
        const receiver = getReceiver()
        const isValid = await receiver.verify({
            signature: request.headers.get('upstash-signature') ?? '',
            body,
        })
        if (!isValid) {
            console.error('[AI Signals Worker] Invalid signature')
            return { ok: false, response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
        }
    } catch (err) {
        console.error('[AI Signals Worker] Signature verification error:', err)
        return { ok: false, response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
    }

    // 3. Internal worker secret proves the call is system-side
    // (same pattern as the gamification worker's awardPoints call).
    try {
        requireInternalWorker(process.env.INTERNAL_WORKER_SECRET)
    } catch {
        console.error('[AI Signals Worker] Invalid internal worker secret')
        return { ok: false, response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
    }

    // 4. Parse and validate payload
    let payload: SignalWorkerPayload
    try {
        payload = JSON.parse(body) as SignalWorkerPayload
    } catch {
        // Malformed JSON — return 200 to prevent infinite retries
        console.error('[AI Signals Worker] Invalid JSON payload')
        return { ok: false, response: NextResponse.json({ error: 'Invalid JSON' }, { status: 200 }) }
    }

    if (typeof payload.signalId !== 'string' || payload.signalId.length === 0) {
        // Missing signal id — permanent failure, return 200 to stop retries
        console.error('[AI Signals Worker] Malformed payload:', payload)
        return { ok: false, response: NextResponse.json({ error: 'Malformed payload' }, { status: 200 }) }
    }

    return { ok: true, payload }
}

export async function POST(request: NextRequest) {
    const auth = await authenticateAndParse(request)
    if (!auth.ok) return auth.response

    // 5. Load the signal (transient DB failure -> 500 so QStash retries)
    const signalDeps = { db: supabaseSignalDb() }
    let signal
    try {
        signal = await getSignalById(auth.payload.signalId, signalDeps)
    } catch (err) {
        console.error('[AI Signals Worker] Failed to load signal:', err)
        return NextResponse.json({ error: 'Signal load failed' }, { status: 500 })
    }

    if (!signal) {
        // Unknown signal id — permanent, return 200 to stop retries
        console.error(`[AI Signals Worker] Unknown signal id: ${auth.payload.signalId}`)
        return NextResponse.json({ error: 'Unknown signal' }, { status: 200 })
    }

    if (signal.processedAt) {
        // Already processed (e.g. a redelivered message) — idempotent no-op
        return NextResponse.json({ ok: true, deduped: true })
    }

    try {
        // 6. Route to the owning agent
        const route = SIGNAL_ROUTING[signal.type]
        const agentDef = route ? AGENTS[route.agentId] : undefined
        if (!route || !agentDef) {
            // No route for this signal type (retired or future type) —
            // mark processed so it never retries forever.
            console.error(
                `[AI Signals Worker] No route for signal type "${signal.type}" — marking processed`
            )
            await markSignalProcessed(signal.id, signalDeps)
            return NextResponse.json({ ok: true, skipped: 'unrouted' })
        }

        // 7. Run the agent's chosen action through the governance pipeline.
        // verifyAndExecute is idempotent via the ai-signal:<id> key, so a
        // QStash retry after a crash can never double-apply the action.
        const result = await verifyAndExecute({
            agentDef,
            action: route.action,
            inputs: route.composeInputs(signal),
            ctx: { clubId: signal.clubId, idempotencyKey: `ai-signal:${signal.id}` },
            deps: { db: supabaseVerifyDb() },
        })

        // 8. Mark processed
        await markSignalProcessed(signal.id, signalDeps)

        console.log(
            `[AI Signals Worker] ✓ signal=${signal.id} type=${signal.type} agent=${route.agentId} -> ${result.status}`
        )

        return NextResponse.json({ ok: true, status: result.status })
    } catch (err) {
        // Transient error — return 500 so QStash retries
        console.error('[AI Signals Worker] Processing failed:', err)
        return NextResponse.json({ error: 'Processing failed' }, { status: 500 })
    }
}
