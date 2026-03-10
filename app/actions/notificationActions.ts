/**
 * Notification Server Actions
 *
 * Mutaciones para notificaciones desde client components.
 * Flujo: Client Component → Server Action → notificationService → Supabase
 *
 * ⚠️ NO usar para GET — eso va en hooks/swr/useNotifications.ts
 */

'use server'

import { createClient } from '@/lib/supabase/server'
import {
    markAsRead,
    markAllAsRead,
    deleteNotification,
} from '@/services/notificationService'

// ---------------------------------------------------------------------------
// Mark single notification as read
// ---------------------------------------------------------------------------

export async function markNotificationReadAction(
    notificationId: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const supabase = await createClient()
        const {
            data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
            return { success: false, error: 'No autenticado' }
        }

        await markAsRead(notificationId, user.id)
        return { success: true }
    } catch (error) {
        console.error('[notificationActions] markNotificationReadAction error:', error)
        return { success: false, error: 'Error al marcar como leída' }
    }
}

// ---------------------------------------------------------------------------
// Mark all notifications as read
// ---------------------------------------------------------------------------

export async function markAllNotificationsReadAction(): Promise<{
    success: boolean
    error?: string
}> {
    try {
        const supabase = await createClient()
        const {
            data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
            return { success: false, error: 'No autenticado' }
        }

        await markAllAsRead(user.id)
        return { success: true }
    } catch (error) {
        console.error('[notificationActions] markAllNotificationsReadAction error:', error)
        return { success: false, error: 'Error al marcar todas como leídas' }
    }
}

// ---------------------------------------------------------------------------
// Delete a notification
// ---------------------------------------------------------------------------

export async function deleteNotificationAction(
    notificationId: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const supabase = await createClient()
        const {
            data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
            return { success: false, error: 'No autenticado' }
        }

        await deleteNotification(notificationId, user.id)
        return { success: true }
    } catch (error) {
        console.error('[notificationActions] deleteNotificationAction error:', error)
        return { success: false, error: 'Error al eliminar notificación' }
    }
}
