/**
 * Widget validation schemas
 */

import { z } from 'zod'

// Base widget schema
export const widgetSchema = z.object({
    name: z.string().min(3, 'El nombre debe tener al menos 3 caracteres').max(100),
    schema: z.record(z.any()).default({}),
})

// Widget creation schema
export const createWidgetSchema = widgetSchema

// Widget update schema
export const updateWidgetSchema = widgetSchema.partial()

// Club widget schema (instance of a widget in a club)
export const clubWidgetSchema = z.object({
    club_id: z.string().uuid('ID de club inválido'),
    widget_id: z.string().uuid('ID de widget inválido'),
    cache_data: z.record(z.any()).default({}),
})

// Club widget data schema
export const clubWidgetDataSchema = z.object({
    club_widget_id: z.string().uuid('ID de club widget inválido'),
    key: z.string().min(1, 'La key no puede estar vacía'),
    value: z.any(),
})

// Update club widget data
export const updateClubWidgetDataSchema = clubWidgetDataSchema.partial().extend({
    club_widget_id: z.string().uuid('ID de club widget inválido'),
})

// TypeScript types inferred from schemas
export type WidgetInput = z.infer<typeof widgetSchema>
export type CreateWidgetInput = z.infer<typeof createWidgetSchema>
export type UpdateWidgetInput = z.infer<typeof updateWidgetSchema>
export type ClubWidgetInput = z.infer<typeof clubWidgetSchema>
export type ClubWidgetDataInput = z.infer<typeof clubWidgetDataSchema>
export type UpdateClubWidgetDataInput = z.infer<typeof updateClubWidgetDataSchema>
