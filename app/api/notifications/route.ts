/**
 * Notifications API Route
 *
 * GET /api/notifications — Obtener notificaciones paginadas del usuario autenticado
 * GET /api/notifications?unread_only=true — Solo no leídas
 * GET /api/notifications?cursor=<uuid>&limit=20 — Paginación cursor-based
 *
 * Flujo: SWR Hook → fetch('/api/notifications') → Este route → notificationService → Supabase
 */

import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server'

import { rateLimit, RATE_LIMITS, addRateLimitHeaders } from '@/lib/rate-limit'
import { createClient } from '@/lib/supabase/server'
import { notificationQuerySchema } from '@/schemas/notificationSchema'
import {
    getNotificationsByUserId,
    getUnreadCount,
} from '@/services/notificationService'

export async function GET(request: NextRequest) {
    // Rate limiting
    const rateLimitResponse = await rateLimit(request, RATE_LIMITS.READ)
    if (rateLimitResponse) return rateLimitResponse

    // Auth
    const supabase = await createClient()
    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse query params
    const { searchParams } = new URL(request.url)
    const parsed = notificationQuerySchema.safeParse({
        cursor: searchParams.get('cursor') ?? undefined,
        limit: searchParams.get('limit') ?? undefined,
        unread_only: searchParams.get('unread_only') ?? undefined,
        category: searchParams.get('category') ?? undefined,
    })

    if (!parsed.success) {
        return NextResponse.json(
            { error: 'Invalid query parameters', details: parsed.error.flatten() },
            { status: 400 }
        )
    }

    const { cursor, limit, unread_only, category } = parsed.data

    try {
        // Fetch notifications + unread count in parallel
        const [result, unreadCount] = await Promise.all([
            getNotificationsByUserId(user.id, {
                cursor,
                limit,
                unreadOnly: unread_only,
                category,
            }),
            getUnreadCount(user.id),
        ])

        const response = NextResponse.json({
            notifications: result.notifications,
            nextCursor: result.nextCursor,
            unreadCount,
        })

        return addRateLimitHeaders(response, request)
    } catch (error) {
        console.error('[API] GET /api/notifications error:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
