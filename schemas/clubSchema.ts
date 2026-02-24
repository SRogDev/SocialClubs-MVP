/**
 * Club validation schemas
 */

import { z } from 'zod'

// Base club schema
export const clubSchema = z.object({
    name: z.string().min(3, 'El nombre debe tener al menos 3 caracteres').max(100),
    logo: z.record(z.any()).nullable().optional(),
    bio: z.string().max(500, 'La bio no puede superar 500 caracteres').nullable().optional(),
    color: z.string().regex(/^#[0-9A-F]{6}$/i, 'Color debe ser un hex válido').nullable().optional(),
    level: z.number().int().min(1).max(10).nullable().optional(),
    privacity: z.enum(['public', 'private', 'restricted']).nullable().optional(),
    tags: z.any().nullable().optional(),
    welcomeMessage: z.string().max(1000, 'El mensaje de bienvenida no puede superar 1000 caracteres').optional(),
})

// Club creation schema
export const createClubSchema = clubSchema.extend({
    name: z.string().min(3, 'El nombre debe tener al menos 3 caracteres').max(100),
})

// Club update schema (all fields optional)
export const updateClubSchema = clubSchema.partial()

// TypeScript types inferred from schemas
export type ClubInput = z.infer<typeof clubSchema>
export type CreateClubInput = z.infer<typeof createClubSchema>
export type UpdateClubInput = z.infer<typeof updateClubSchema>
