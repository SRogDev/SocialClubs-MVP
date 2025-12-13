/**
 * User profile validation schemas
 */

import { z } from 'zod'

// Profile update schema
export const profileSchema = z.object({
    name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres').max(100).optional(),
    username: z
        .string()
        .min(3, 'El username debe tener al menos 3 caracteres')
        .max(30)
        .regex(/^[a-zA-Z0-9_]+$/, 'Solo letras, números y guión bajo')
        .optional(),
    avatar_url: z.string().url('URL inválida').nullable().optional(),
    bio: z.string().max(500, 'La bio no puede superar 500 caracteres').nullable().optional(),
    is_member: z.boolean().optional(),
})

// Full profile update (all fields optional)
export const updateProfileSchema = profileSchema.partial()

// Username check schema
export const usernameSchema = z.object({
    username: z
        .string()
        .min(3, 'El username debe tener al menos 3 caracteres')
        .max(30)
        .regex(/^[a-zA-Z0-9_]+$/, 'Solo letras, números y guión bajo'),
})

// TypeScript types inferred from schemas
export type ProfileInput = z.infer<typeof profileSchema>
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>
export type UsernameInput = z.infer<typeof usernameSchema>
