/**
 * User Service - User profile operations
 */

import { cache } from 'react'

import { createClient } from '@/lib/supabase/server'
import { updateProfileSchema, type UpdateProfileInput } from '@/schemas/profileSchema'
import type { Club } from '@/types/club'
import type { User, UserPoints, UserClubMembership } from '@/types/user'

/**
 * Get user profile by ID
 */
export const getUserProfile = cache(async (id: string): Promise<User | null> => {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', id)
        .single()

    if (error) {
        console.error('Error fetching user profile:', error)
        return null
    }

    return data
})

/**
 * Get user profile by username
 */
export const getUserByUsername = cache(async (username: string): Promise<User | null> => {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('username', username)
        .single()

    if (error) {
        console.error('Error fetching user by username:', error)
        return null
    }

    return data
})

/**
 * Get current user (authenticated user)
 */
export const getCurrentUser = cache(async (): Promise<User | null> => {
    const supabase = await createClient()

    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()

    if (authError || !authUser) {
        return null
    }

    const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .single()

    if (error) {
        console.error('Error fetching current user:', error)
        return null
    }

    return data
})

/**
 * Update user profile
 */
export async function updateUserProfile(id: string, input: UpdateProfileInput): Promise<User> {
    // Validate input
    const validated = updateProfileSchema.parse(input)

    const supabase = await createClient()

    const { data, error } = await supabase
        .from('users')
        .update(validated)
        .eq('id', id)
        .select()
        .single()

    if (error) {
        console.error('Error updating user profile:', error)
        throw new Error('Failed to update user profile')
    }

    return data
}

/**
 * Get user clubs (clubs the user is a member of) - with full details
 */
export const getUserClubsWithDetails = cache(async (userId: string): Promise<Club[]> => {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('users_clubs')
        .select('clubs(*)')
        .eq('user_id', userId)

    if (error) {
        console.error('Error fetching user clubs:', error)
        throw new Error('Failed to fetch user clubs')
    }

    // Extract clubs from the joined data
    return data?.map((item: any) => item.clubs).filter(Boolean) || []
})

/**
 * Get user club memberships with details
 */
export const getUserClubMemberships = cache(async (userId: string): Promise<UserClubMembership[]> => {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('users_clubs')
        .select('*')
        .eq('user_id', userId)

    if (error) {
        console.error('Error fetching user club memberships:', error)
        throw new Error('Failed to fetch user club memberships')
    }

    return data || []
})

/**
 * Get user points (superlikes, etc.)
 */
export const getUserPoints = cache(async (userId: string): Promise<UserPoints | null> => {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('usersPoints')
        .select('*')
        .eq('user', userId)
        .single()

    if (error) {
        console.error('Error fetching user points:', error)
        return null
    }

    return data
})

/**
 * Update user points
 */
export async function updateUserPoints(userId: string, superlikes: number): Promise<UserPoints> {
    const supabase = await createClient()

    // Check if user points record exists
    const { data: existing } = await supabase
        .from('usersPoints')
        .select('*')
        .eq('user', userId)
        .single()

    if (existing) {
        // Update existing record
        const { data, error } = await supabase
            .from('usersPoints')
            .update({ superlikes })
            .eq('user', userId)
            .select()
            .single()

        if (error) {
            console.error('Error updating user points:', error)
            throw new Error('Failed to update user points')
        }

        return data
    } else {
        // Create new record
        const { data, error } = await supabase
            .from('usersPoints')
            .insert({ user: userId, superlikes })
            .select()
            .single()

        if (error) {
            console.error('Error creating user points:', error)
            throw new Error('Failed to create user points')
        }

        return data
    }
}

/**
 * Increment user superlikes
 */
export async function incrementSuperlikes(userId: string, amount: number = 1): Promise<void> {
    const supabase = await createClient()

    await supabase.rpc('increment_superlikes', {
        user_id_input: userId,
        amount_input: amount
    })
}

/**
 * Decrement user superlikes
 */
export async function decrementSuperlikes(userId: string, amount: number = 1): Promise<void> {
    const supabase = await createClient()

    await supabase.rpc('decrement_superlikes', {
        user_id_input: userId,
        amount_input: amount
    })
}

/**
 * Check if username is available
 */
export async function isUsernameAvailable(username: string): Promise<boolean> {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('users')
        .select('id')
        .eq('username', username)
        .single()

    // If no data found, username is available
    return !data
}
