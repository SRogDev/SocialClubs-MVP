/**
 * Video Schema - Validation for video uploads and metadata
 */

import { z } from 'zod'

// Video constraints
export const VIDEO_CONSTRAINTS = {
    MAX_FILE_SIZE: 500 * 1024 * 1024, // 500 MB in bytes
    MAX_DURATION: 60 * 60, // 60 minutes in seconds
    ALLOWED_MIME_TYPES: ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm', 'video/x-matroska']
} as const

/**
 * Mux video metadata stored in posts.content JSONB
 */
export const muxVideoMetadataSchema = z.object({
    mux_asset_id: z.string().min(1, 'Mux asset ID is required'),
    mux_playback_id: z.string().min(1, 'Mux playback ID is required'),
    status: z.enum(['uploading', 'processing', 'ready', 'errored']),
    duration: z.number().positive().optional(),
    aspect_ratio: z.string().optional(),
    thumbnail_url: z.string().url().optional(),
    max_resolution: z.string().optional(),
    error_message: z.string().optional()
})

/**
 * Post content structure for video posts
 */
export const videoPostContentSchema = z.object({
    video: muxVideoMetadataSchema,
    caption: z.string().optional()
})

/**
 * Input for creating video upload
 */
export const createVideoUploadSchema = z.object({
    club_id: z.string().uuid('Invalid club ID'),
    caption: z.string().max(2000, 'Caption too long').optional()
})

/**
 * Webhook payload from Mux
 */
export const muxWebhookSchema = z.object({
    type: z.string(),
    object: z.object({
        type: z.string(),
        id: z.string()
    }),
    data: z.record(z.any()),
    created_at: z.string(),
    id: z.string()
})

// Types
export type MuxVideoMetadata = z.infer<typeof muxVideoMetadataSchema>
export type VideoPostContent = z.infer<typeof videoPostContentSchema>
export type CreateVideoUploadInput = z.infer<typeof createVideoUploadSchema>
export type MuxWebhookPayload = z.infer<typeof muxWebhookSchema>
