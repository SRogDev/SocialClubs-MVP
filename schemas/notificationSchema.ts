/**
 * Notification Schemas — Zod validation
 *
 * Shared between client and server for consistent validation.
 * Used in API routes, server actions, and form validation.
 */

import { z } from 'zod'

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export const notificationTypeSchema = z.enum([
    'new_post_club',
    'videocall_announcement',
    'new_message_club',
    'reminder_use',
    'new_subscriber_pay',
    'club_level_up',
    'user_level_up',
    'other',
])

export const notificationCategorySchema = z.enum([
    'engagement',
    'transactional',
    'marketing',
])

// ---------------------------------------------------------------------------
// Create notification (server-side)
// ---------------------------------------------------------------------------

export const createNotificationSchema = z.object({
    user_id: z.string().uuid(),
    type: notificationTypeSchema,
    title: z.string().min(1).max(200),
    body: z.string().min(1).max(500),
    club_id: z.string().uuid().nullable().optional(),
    action_url: z.string().max(500).nullable().optional(),
    icon: z.string().max(10).optional().default('🔔'),
    category: notificationCategorySchema.optional().default('engagement'),
    metadata: z.record(z.unknown()).optional().default({}),
})

// ---------------------------------------------------------------------------
// Query params for GET /api/notifications
// ---------------------------------------------------------------------------

export const notificationQuerySchema = z.object({
    cursor: z.string().uuid().optional(),
    limit: z.coerce.number().int().min(1).max(50).optional().default(20),
    unread_only: z
        .string()
        .transform((v) => v === 'true')
        .optional(),
    category: notificationCategorySchema.optional(),
})

// ---------------------------------------------------------------------------
// Mark as read
// ---------------------------------------------------------------------------

export const markReadSchema = z.object({
    notification_id: z.string().uuid(),
})

export const markAllReadSchema = z.object({
    before: z.string().datetime().optional(),
})

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type CreateNotificationInput = z.infer<typeof createNotificationSchema>
export type NotificationQuery = z.infer<typeof notificationQuerySchema>
export type MarkReadInput = z.infer<typeof markReadSchema>
export type MarkAllReadInput = z.infer<typeof markAllReadSchema>
