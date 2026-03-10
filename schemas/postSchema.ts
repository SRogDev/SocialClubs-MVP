/**
 * Post validation schemas
 */

import { z } from 'zod'

// Post types enum
export const postTypeSchema = z.enum(['text', 'image', 'video', 'audio', 'poll', 'widget'])

// Base post schema
export const postSchema = z.object({
    club_id: z.string().uuid('ID de club inválido'),
    content: z.record(z.any()),
    type: postTypeSchema,
})

// Poll option schema
export const pollOptionSchema = z.object({
    id: z.string().optional(),
    text: z.string().min(1, 'La opción no puede estar vacía').max(200),
    votes: z.number().int().min(0).default(0).optional(),
})

// Poll schema
export const pollSchema = z.object({
    question: z.string().min(3, 'La pregunta debe tener al menos 3 caracteres').max(500),
    options: z.array(pollOptionSchema).min(2, 'Debe haber al menos 2 opciones').max(10, 'Máximo 10 opciones'),
    is_anonymous: z.boolean().default(false),
    is_multiple_choice: z.boolean().default(false),
    allows_add_options: z.boolean().default(false),
    closes_at: z.string().datetime().nullable().optional(),
})

// Post with poll schema
export const postWithPollSchema = postSchema.extend({
    type: z.literal('poll'),
    poll: pollSchema,
})

// Widget post schema
export const widgetPostSchema = postSchema.extend({
    type: z.literal('widget'),
    pinned: z.boolean().default(false),
})

// Post creation schema
export const createPostSchema = z.discriminatedUnion('type', [
    postSchema.extend({ type: z.enum(['text', 'image', 'video', 'audio']) }),
    postWithPollSchema,
    widgetPostSchema,
])

export type WidgetPostInput = z.infer<typeof widgetPostSchema>

// Post update schema
export const updatePostSchema = postSchema.partial()

// Comment schema
export const commentSchema = z.object({
    post_id: z.string().uuid('ID de post inválido'),
    content: z.string().min(1, 'El comentario no puede estar vacío').max(1000),
    parent_comment_id: z.string().uuid().nullable().optional(),
})

// Post interaction schema
export const postInteractionSchema = z.object({
    post_id: z.string().uuid('ID de post inválido'),
    interaction_type: z.enum(['like', 'superlike']),
})

// TypeScript types inferred from schemas
export type PostInput = z.infer<typeof postSchema>
export type CreatePostInput = z.infer<typeof createPostSchema>
export type UpdatePostInput = z.infer<typeof updatePostSchema>
export type PollInput = z.infer<typeof pollSchema>
export type PollOptionInput = z.infer<typeof pollOptionSchema>
export type CommentInput = z.infer<typeof commentSchema>
export type PostInteractionInput = z.infer<typeof postInteractionSchema>
