/**
 * Authentication Service - Auth operations using Supabase
 */

import { createClient } from '@/lib/supabase/server'
import { signInSchema, signUpSchema, resetPasswordSchema, updatePasswordSchema, type SignInInput, type SignUpInput, type ResetPasswordInput, type UpdatePasswordInput } from '@/schemas/authSchema'

/**
 * Sign in with email and password
 */
export async function signIn(input: SignInInput) {
    // Validate input
    const validated = signInSchema.parse(input)

    const supabase = await createClient()

    const { data, error } = await supabase.auth.signInWithPassword({
        email: validated.email,
        password: validated.password,
    })

    if (error) {
        console.error('Error signing in:', error)
        throw new Error('Invalid email or password')
    }

    return data
}

/**
 * Sign up with email, password, and name
 */
export async function signUp(input: SignUpInput) {
    // Validate input
    const validated = signUpSchema.parse(input)

    const supabase = await createClient()

    // Create auth user
    const { data, error } = await supabase.auth.signUp({
        email: validated.email,
        password: validated.password,
        options: {
            data: {
                name: validated.name,
                username: validated.username,
            },
        },
    })

    if (error) {
        console.error('Error signing up:', error)
        throw new Error('Failed to create account')
    }

    // Create user profile in users table
    if (data.user) {
        const { error: profileError } = await supabase
            .from('users')
            .insert({
                id: data.user.id,
                name: validated.name,
                username: validated.username,
                avatar_url: null,
                bio: null,
                is_member: false,
            })

        if (profileError) {
            console.error('Error creating user profile:', profileError)
            // Note: The auth user is already created at this point
            // You may want to implement a cleanup mechanism
        }

        // Initialize user points
        await supabase
            .from('usersPoints')
            .insert({
                user: data.user.id,
                superlikes: 10, // Default starting superlikes
            })
    }

    return data
}

/**
 * Sign out
 */
export async function signOut() {
    const supabase = await createClient()

    const { error } = await supabase.auth.signOut()

    if (error) {
        console.error('Error signing out:', error)
        throw new Error('Failed to sign out')
    }
}

/**
 * Request password reset
 */
export async function resetPassword(input: ResetPasswordInput) {
    // Validate input
    const validated = resetPasswordSchema.parse(input)

    const supabase = await createClient()

    const { error } = await supabase.auth.resetPasswordForEmail(validated.email, {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/update-password`,
    })

    if (error) {
        console.error('Error requesting password reset:', error)
        throw new Error('Failed to send password reset email')
    }
}

/**
 * Update password (after reset)
 */
export async function updatePassword(input: UpdatePasswordInput) {
    // Validate input
    const validated = updatePasswordSchema.parse(input)

    const supabase = await createClient()

    const { error } = await supabase.auth.updateUser({
        password: validated.newPassword,
    })

    if (error) {
        console.error('Error updating password:', error)
        throw new Error('Failed to update password')
    }
}

/**
 * Get current session
 */
export async function getSession() {
    const supabase = await createClient()

    const { data, error } = await supabase.auth.getSession()

    if (error) {
        console.error('Error getting session:', error)
        return null
    }

    return data.session
}

/**
 * Get current authenticated user
 */
export async function getAuthUser() {
    const supabase = await createClient()

    const { data, error } = await supabase.auth.getUser()

    if (error) {
        console.error('Error getting user:', error)
        return null
    }

    return data.user
}

/**
 * Sign in with OAuth provider (Google, GitHub, etc.)
 */
export async function signInWithOAuth(provider: 'google' | 'github' | 'discord') {
    const supabase = await createClient()

    const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
            redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
        },
    })

    if (error) {
        console.error('Error signing in with OAuth:', error)
        throw new Error('Failed to sign in with OAuth')
    }

    return data
}
