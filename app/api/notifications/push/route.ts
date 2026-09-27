/**
 * POST /api/notifications/push
 *
 * Supabase Database Webhook handler.
 * Supabase lo llama cada vez que se hace un INSERT en la tabla `notifications`.
 *
 * Flujo:
 *   INSERT en notifications → Supabase Database Webhook → Este handler → OneSignal REST API → Push al usuario
 *
 * Configuración en Supabase Dashboard → Database → Webhooks:
 *   - Table: notifications
 *   - Events: INSERT
 *   - URL: https://tu-app.vercel.app/api/notifications/push
 *   - Header: x-webhook-secret = <SUPABASE_WEBHOOK_SECRET>
 */

import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server'

import { send } from '@/services/notificationTemplateService'

// Supabase webhook payload shape (INSERT)
interface SupabaseWebhookPayload {
  type: 'INSERT' | 'UPDATE' | 'DELETE'
  table: string
  schema: string
  record: {
    id: string
    user_id: string | null
    title: string | null
    body: string | null
    action_url: string | null
    icon: string | null
    category: string | null
    type: string | null
    metadata: Record<string, unknown> | null
    read: boolean
    created_at: string
  } | null
  old_record: Record<string, unknown> | null
}

export async function POST(request: NextRequest) {
  // 1. Verify webhook secret
  const secret = request.headers.get('x-webhook-secret')
  if (!process.env.SUPABASE_WEBHOOK_SECRET || secret !== process.env.SUPABASE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 2. Parse payload
  let payload: SupabaseWebhookPayload
  try {
    payload = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // 3. Only process INSERT events on the notifications table
  if (payload.type !== 'INSERT' || payload.table !== 'notifications' || !payload.record) {
    return NextResponse.json({ ok: true })
  }

  const { user_id, title, body, action_url } = payload.record

  // Skip if missing required fields
  if (!user_id || !title || !body) {
    return NextResponse.json({ ok: true })
  }

  // 4. Send push notification via OneSignal
  // The title and body are already rendered (stored in the notifications row),
  // so we use the 'other' template which passes them through as-is.
  try {
    const result = await send(
      'other',
      {
        title,
        body,
        url: action_url ?? '/',
      },
      [user_id]
    )

    if (!result.success) {
      console.error('[push-webhook] OneSignal send failed:', result.error)
      // Return 200 anyway — Supabase will retry on 5xx, not on 4xx
      return NextResponse.json({ ok: false, error: result.error })
    }

    return NextResponse.json({ ok: true, onesignalId: result.onesignalId })
  } catch (err) {
    console.error('[push-webhook] Unexpected error:', err)
    // Return 500 so Supabase retries the webhook
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
