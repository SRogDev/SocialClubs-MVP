/**
 * Notification types based on database.sql schema
 * NOTA: Las notificaciones se trabajarán en el futuro
 */

export interface Notification {
    id: string
    user_id: string | null
    type: string | null
    title: string | null
    body: string | null
    read: boolean
    created_at: string
}

export interface FeedbackMessage {
    id: string
    user_id: string | null
    type: string | null
    content: string | null
    created_at: string
}
