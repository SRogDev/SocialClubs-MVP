/**
 * Authentication validation schemas
 */

import { z } from 'zod'

// Email validation
const emailSchema = z.string().email('Email inválido')

// Password validation
const passwordSchema = z
    .string()
    .min(8, 'La contraseña debe tener al menos 8 caracteres')
    .regex(/[A-Z]/, 'Debe contener al menos una mayúscula')
    .regex(/[a-z]/, 'Debe contener al menos una minúscula')
    .regex(/[0-9]/, 'Debe contener al menos un número')

// Sign in schema
export const signInSchema = z.object({
    email: emailSchema,
    password: z.string().min(1, 'La contraseña es requerida'),
})

// Sign up schema
export const signUpSchema = z.object({
    email: emailSchema,
    password: passwordSchema,
    name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres').max(100),
    username: z
        .string()
        .min(3, 'El username debe tener al menos 3 caracteres')
        .max(30)
        .regex(/^[a-zA-Z0-9_]+$/, 'Solo letras, números y guión bajo'),
})

// Password reset request schema
export const resetPasswordSchema = z.object({
    email: emailSchema,
})

// Update password schema
export const updatePasswordSchema = z
    .object({
        newPassword: passwordSchema,
        confirmPassword: z.string().min(1, 'Confirma tu contraseña'),
    })
    .refine((data) => data.newPassword === data.confirmPassword, {
        message: 'Las contraseñas no coinciden',
        path: ['confirmPassword'],
    })

// Change password schema (requires current password)
export const changePasswordSchema = z
    .object({
        currentPassword: z.string().min(1, 'Contraseña actual requerida'),
        newPassword: passwordSchema,
        confirmPassword: z.string().min(1, 'Confirma tu contraseña'),
    })
    .refine((data) => data.newPassword === data.confirmPassword, {
        message: 'Las contraseñas no coinciden',
        path: ['confirmPassword'],
    })

// TypeScript types inferred from schemas
export type SignInInput = z.infer<typeof signInSchema>
export type SignUpInput = z.infer<typeof signUpSchema>
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>
export type UpdatePasswordInput = z.infer<typeof updatePasswordSchema>
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>
