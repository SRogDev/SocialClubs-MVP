/**
 * Widget validation schemas
 */

import { z } from 'zod'

// Widget slugs
export const widgetSlugSchema = z.enum(['giveaway', 'countdown', 'question-box'])

// Publish a widget (generic — formData is validated per-slug in the action)
export const publishWidgetSchema = z.object({
    clubId: z.string().uuid('Invalid club ID'),
    widgetSlug: widgetSlugSchema,
    formData: z.record(z.string(), z.string()),
})

// Per-widget form data schemas
export const giveawayFormSchema = z.object({
    title: z.string().min(3, 'Title must be at least 3 characters').max(100),
    prize: z.string().min(5, 'Prize description must be at least 5 characters').max(500),
    resolve_at: z.string().min(1, 'Draw date is required'),
})

export const countdownFormSchema = z.object({
    title: z.string().min(3, 'Title must be at least 3 characters').max(100),
    target_at: z.string().min(1, 'Target date is required'),
})

export const questionBoxFormSchema = z.object({
    title: z.string().min(3, 'Title must be at least 3 characters').max(100),
})

// Interact with a widget
export const interactWithWidgetSchema = z.object({
    clubWidgetId: z.string().uuid('Invalid club widget ID'),
    action: z.enum(['join', 'leave', 'ask', 'answer']),
    payload: z.record(z.string(), z.any()).optional(),
})

// Generic data field update (admin)
export const updateWidgetDataFieldSchema = z.object({
    clubWidgetId: z.string().uuid(),
    key: z.string().min(1),
    value: z.any(),
})

// TypeScript types inferred from schemas
export type WidgetSlug = z.infer<typeof widgetSlugSchema>
export type PublishWidgetInput = z.infer<typeof publishWidgetSchema>
export type GiveawayFormInput = z.infer<typeof giveawayFormSchema>
export type CountdownFormInput = z.infer<typeof countdownFormSchema>
export type QuestionBoxFormInput = z.infer<typeof questionBoxFormSchema>
export type InteractWithWidgetInput = z.infer<typeof interactWithWidgetSchema>
