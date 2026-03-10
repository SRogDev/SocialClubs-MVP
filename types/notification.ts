/**
 * Notification types — extended for in-app notification center
 * Matches the extended notifications table (migration 20260301000001)
 */

export type NotificationType =
    | 'new_post_club'
    | 'videocall_announcement'
    | 'new_message_club'
    | 'reminder_use'
    | 'new_subscriber_pay'
    | 'club_level_up'
    | 'user_level_up'
    | 'other'

export type NotificationCategory = 'engagement' | 'transactional' | 'marketing'

export interface Notification {
    id: string
    user_id: string | null
    type: NotificationType | string | null
    title: string | null
    body: string | null
    read: boolean
    club_id: string | null
    action_url: string | null
    icon: string | null
    category: NotificationCategory | null
    metadata: Record<string, unknown> | null
    created_at: string
}

/** Payload for creating a notification server-side */
export interface CreateNotificationInput {
    user_id: string
    type: NotificationType
    title: string
    body: string
    club_id?: string | null
    action_url?: string | null
    icon?: string
    category?: NotificationCategory
    metadata?: Record<string, unknown>
}

/** Level-up metadata embedded in notification.metadata */
export interface LevelUpMetadata {
    old_level: number
    new_level: number
    club_name: string
    club_color: string
}

export interface FeedbackMessage {
    id: string
    user_id: string | null
    type: string | null
    content: string | null
    created_at: string
}
