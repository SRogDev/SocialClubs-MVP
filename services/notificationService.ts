/**
 * Notification Service (Repository)
 *
 * Contiene TODAS las operaciones CRUD para notificaciones.
 * Usado por API routes y Server Actions — nunca directamente desde componentes.
 *
 * Flujo:
 *   GET:      API Route → notificationService.getByUserId() → Supabase
 *   Mutation:  Server Action → notificationService.markAsRead() → Supabase
 *   Create:   Service/Trigger → notificationService.create() → Supabase
 */

import { createClient } from '@/lib/supabase/server'
import type { Notification, CreateNotificationInput } from '@/types/notification'

// ---------------------------------------------------------------------------
// READ
// ---------------------------------------------------------------------------

/**
 * Obtener notificaciones paginadas de un usuario (cursor-based)
 */
export async function getNotificationsByUserId(
    userId: string,
    options: {
        cursor?: string
        limit?: number
        unreadOnly?: boolean
        category?: string
    } = {}
): Promise<{ notifications: Notification[]; nextCursor: string | null }> {
    const supabase = await createClient()
    const { cursor, limit = 20, unreadOnly, category } = options

    let query = supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit + 1) // +1 para saber si hay más

    if (cursor) {
        // Cursor-based: obtener notificaciones anteriores a la del cursor
        const { data: cursorRow } = await supabase
            .from('notifications')
            .select('created_at')
            .eq('id', cursor)
            .single()

        if (cursorRow) {
            query = query.lt('created_at', cursorRow.created_at)
        }
    }

    if (unreadOnly) {
        query = query.eq('read', false)
    }

    if (category) {
        query = query.eq('category', category)
    }

    const { data, error } = await query

    if (error) {
        console.error('[notificationService] getNotificationsByUserId error:', error)
        throw new Error('Error fetching notifications')
    }

    const notifications = (data ?? []) as Notification[]
    const hasMore = notifications.length > limit
    const result = hasMore ? notifications.slice(0, limit) : notifications
    const nextCursor = hasMore ? result[result.length - 1]?.id ?? null : null

    return { notifications: result, nextCursor }
}

/**
 * Obtener conteo de notificaciones no leídas
 */
export async function getUnreadCount(userId: string): Promise<number> {
    const supabase = await createClient()

    const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('read', false)

    if (error) {
        console.error('[notificationService] getUnreadCount error:', error)
        return 0
    }

    return count ?? 0
}

// ---------------------------------------------------------------------------
// CREATE
// ---------------------------------------------------------------------------

/**
 * Crear una notificación (usado por services y triggers)
 */
export async function createNotification(
    input: CreateNotificationInput
): Promise<Notification> {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('notifications')
        .insert({
            user_id: input.user_id,
            type: input.type,
            title: input.title,
            body: input.body,
            club_id: input.club_id ?? null,
            action_url: input.action_url ?? null,
            icon: input.icon ?? '🔔',
            category: input.category ?? 'engagement',
            metadata: input.metadata ?? {},
            read: false,
        })
        .select()
        .single()

    if (error) {
        console.error('[notificationService] createNotification error:', error)
        throw new Error('Error creating notification')
    }

    return data as Notification
}

/**
 * Crear notificaciones en batch (para notificar a múltiples usuarios)
 */
export async function createBatchNotifications(
    inputs: CreateNotificationInput[]
): Promise<number> {
    if (inputs.length === 0) return 0

    const supabase = await createClient()

    const rows = inputs.map((input) => ({
        user_id: input.user_id,
        type: input.type,
        title: input.title,
        body: input.body,
        club_id: input.club_id ?? null,
        action_url: input.action_url ?? null,
        icon: input.icon ?? '🔔',
        category: input.category ?? 'engagement',
        metadata: input.metadata ?? {},
        read: false,
    }))

    const { error, count } = await supabase
        .from('notifications')
        .insert(rows)

    if (error) {
        console.error('[notificationService] createBatchNotifications error:', error)
        throw new Error('Error creating batch notifications')
    }

    return count ?? inputs.length
}

// ---------------------------------------------------------------------------
// UPDATE
// ---------------------------------------------------------------------------

/**
 * Marcar una notificación como leída
 */
export async function markAsRead(
    notificationId: string,
    userId: string
): Promise<void> {
    const supabase = await createClient()

    const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId)
        .eq('user_id', userId) // RLS safety + double check

    if (error) {
        console.error('[notificationService] markAsRead error:', error)
        throw new Error('Error marking notification as read')
    }
}

/**
 * Marcar TODAS las notificaciones de un usuario como leídas
 */
export async function markAllAsRead(userId: string): Promise<void> {
    const supabase = await createClient()

    const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', userId)
        .eq('read', false)

    if (error) {
        console.error('[notificationService] markAllAsRead error:', error)
        throw new Error('Error marking all notifications as read')
    }
}

// ---------------------------------------------------------------------------
// DELETE
// ---------------------------------------------------------------------------

/**
 * Eliminar una notificación
 */
export async function deleteNotification(
    notificationId: string,
    userId: string
): Promise<void> {
    const supabase = await createClient()

    const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId)
        .eq('user_id', userId)

    if (error) {
        console.error('[notificationService] deleteNotification error:', error)
        throw new Error('Error deleting notification')
    }
}
