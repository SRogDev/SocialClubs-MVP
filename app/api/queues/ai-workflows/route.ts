/**
 * QStash Worker: Community Automation Workflows
 * POST /api/queues/ai-workflows
 *
 * Called BY QStash (never directly by the browser).
 * Verifies the QStash HMAC signature, then runs the requested workflow
 * (welcome | reengagement | digest) via lib/ai/workflows.ts — every step
 * goes through the governance pipeline's verifyAndExecute, so the club's
 * proactivity level is enforced per step (L1 = draft-only, always).
 *
 * Idempotency: steps dedupe on `<idempotencyKey>:<action>`; redeliveries
 * replay recorded outcomes without side effects.
 *
 * Return codes:
 *   200 → success, idempotent replay, or permanently invalid payload (no retry)
 *   401 → bad signature (QStash will NOT retry — signature failures are permanent)
 *   500 → transient error (QStash retries up to 3 times with exponential backoff)
 */
import { Receiver } from '@upstash/qstash'
import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server'

import { WORKFLOW_NAMES, runWorkflow, type WorkflowName } from '@/lib/ai/workflows'
import { supabaseVerifyDb } from '@/lib/ai/verify'
import { requireInternalWorker } from '@/lib/authz'
import type { AIWorkflowJobPayload } from '@/lib/qstash'

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
            console.error('[AI Workflows Worker] Invalid signature')
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }
    } catch (err) {
        console.error('[AI Workflows Worker] Signature verification error:', err)
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 3. Internal worker secret proves the call is system-side
    try {
        requireInternalWorker(process.env.INTERNAL_WORKER_SECRET)
    } catch {
        console.error('[AI Workflows Worker] Invalid internal worker secret')
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 4. Parse and validate payload
    let payload: AIWorkflowJobPayload
    try {
        payload = JSON.parse(body) as AIWorkflowJobPayload
    } catch {
        console.error('[AI Workflows Worker] Invalid JSON payload')
        return NextResponse.json({ error: 'Invalid JSON' }, { status: 200 })
    }

    if (
        !payload.workflowName ||
        !(WORKFLOW_NAMES as readonly string[]).includes(payload.workflowName) ||
        !payload.clubId ||
        !payload.idempotencyKey
    ) {
        console.error('[AI Workflows Worker] Malformed payload:', payload)
        return NextResponse.json({ error: 'Malformed payload' }, { status: 200 })
    }

    // 5. Run the workflow (service-role verify DB; every step verified)
    try {
        const result = await runWorkflow(payload.workflowName as WorkflowName, {
            clubId: payload.clubId,
            memberId: payload.memberId,
            idempotencyKey: payload.idempotencyKey,
        }, { db: supabaseVerifyDb() })

        console.log(
            `[AI Workflows Worker] ✓ workflow=${result.workflow} club=${result.clubId} ` +
                `status=${result.status} replay=${result.idempotentReplay}`
        )

        return NextResponse.json({ ok: true, result })
    } catch (err) {
        // Validation errors (unknown workflow, missing memberId, missing key)
        // are permanent — 200 so QStash does NOT retry.
        const message = err instanceof Error ? err.message : String(err)
        if (/unknown workflow|idempotency|memberId/i.test(message)) {
            console.error('[AI Workflows Worker] Permanent failure:', message)
            return NextResponse.json({ error: message }, { status: 200 })
        }
        console.error('[AI Workflows Worker] Transient failure:', err)
        return NextResponse.json({ error: 'Processing failed' }, { status: 500 })
    }
}
