/**
 * Club Service - CRUD operations for clubs
 */

import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import { createClubSchema, updateClubSchema, type CreateClubInput, type UpdateClubInput } from '@/schemas/clubSchema'
import type { Club, ClubStats } from '@/types/club'

/**
 * Generate a unique random club link
 * Format: 8-character alphanumeric string (e.g., 'aB3xK9mQ')
 * Similar to invite links in WhatsApp, Telegram, etc.
 */
export async function generateUniqueClubLink(): Promise<string> {
    const supabase = await createClient()
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    const length = 8
    let isUnique = false
    let clubLink = ''

    // Keep generating until we find a unique link
    while (!isUnique) {
        // Generate random string
        clubLink = Array.from({ length }, () =>
            characters.charAt(Math.floor(Math.random() * characters.length))
        ).join('')

        // Check if it already exists
        const { data, error } = await supabase
            .from('clubs')
            .select('id')
            .eq('club_link', clubLink)
            .maybeSingle()

        if (error) {
            console.error('Error checking club_link uniqueness:', error)
            throw new Error('Failed to generate unique club link')
        }

        // If no club found with this link, it's unique
        isUnique = !data
    }

    return clubLink
}

/**
 * Get all clubs
 */
export const getClubs = cache(async (): Promise<Club[]> => {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('clubs')
        .select('*')
        .order('created_at', { ascending: false })

    if (error) {
        console.error('Error fetching clubs:', error)
        throw new Error('Failed to fetch clubs')
    }

    return data || []
})

/**
 * Get a single club by ID
 */
export const getClubById = cache(async (id: string): Promise<Club | null> => {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('clubs')
        .select('*')
        .eq('id', id)
        .single()

    if (error) {
        console.error('Error fetching club:', error)
        return null
    }

    return data
})

/**
 * Get a single club by club_link (for invite/join functionality)
 */
export const getClubByLink = cache(async (clubLink: string): Promise<Club | null> => {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('clubs')
        .select('*')
        .eq('club_link', clubLink)
        .single()

    if (error) {
        console.error('Error fetching club by link:', error)
        return null
    }

    return data
})

/**
 * Get clubs by user ID (clubs the user is a member of)
 */
export const getUserClubs = cache(async (userId: string): Promise<Club[]> => {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('clubs')
        .select('*, users_clubs!inner(user_id)')
        .eq('users_clubs.user_id', userId)
        .order('created_at', { ascending: false })

    if (error) {
        console.error('Error fetching user clubs:', error)
        throw new Error('Failed to fetch user clubs')
    }

    return data || []
})

/**
 * Get clubs created by user
 */
export const getClubsByCreator = cache(async (userId: string): Promise<Club[]> => {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('clubs')
        .select('*')
        .eq('creator', userId)
        .order('created_at', { ascending: false })

    if (error) {
        console.error('Error fetching clubs by creator:', error)
        throw new Error('Failed to fetch clubs by creator')
    }

    return data || []
})

/**
 * Create a new club
 */
export async function createClub(input: CreateClubInput, userId: string): Promise<Club> {
    // Validate input
    const validated = createClubSchema.parse(input)

    const supabase = await createClient()

    // Generate unique club link
    const clubLink = await generateUniqueClubLink()

    const { data, error } = await supabase
        .from('clubs')
        .insert({
            ...validated,
            creator: userId,
            club_link: clubLink,
        })
        .select()
        .single()

    if (error) {
        console.error('Error creating club:', error)
        throw new Error('Failed to create club')
    }

    return data
}

/**
 * Update a club
 */
export async function updateClub(id: string, input: UpdateClubInput): Promise<Club> {
    // Validate input
    const validated = updateClubSchema.parse(input)

    const supabase = await createClient()

    const { data, error } = await supabase
        .from('clubs')
        .update(validated)
        .eq('id', id)
        .select()
        .single()

    if (error) {
        console.error('Error updating club:', error)
        throw new Error('Failed to update club')
    }

    return data
}

/**
 * Delete a club
 */
export async function deleteClub(id: string): Promise<void> {
    const supabase = await createClient()

    const { error } = await supabase
        .from('clubs')
        .delete()
        .eq('id', id)

    if (error) {
        console.error('Error deleting club:', error)
        throw new Error('Failed to delete club')
    }
}

/**
 * Get club statistics
 */
export const getClubStats = cache(async (clubId: string): Promise<ClubStats | null> => {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('clubStats')
        .select('*')
        .eq('club', clubId)
        .single()

    if (error) {
        console.error('Error fetching club stats:', error)
        return null
    }

    return data
})

/**
 * Get club member count
 */
export const getClubMemberCount = cache(async (clubId: string): Promise<number> => {
    const supabase = await createClient()

    const { count, error } = await supabase
        .from('users_clubs')
        .select('*', { count: 'exact', head: true })
        .eq('club_id', clubId)

    if (error) {
        console.error('Error fetching club member count:', error)
        return 0
    }

    return count || 0
})

/**
 * Check if user is member of club
 */
export const isUserClubMember = cache(async (userId: string, clubId: string): Promise<boolean> => {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('users_clubs')
        .select('id')
        .eq('user_id', userId)
        .eq('club_id', clubId)
        .single()

    if (error) {
        return false
    }

    return !!data
})

/**
 * Join a club (add user to club membership)
 */
export async function joinClub(userId: string, clubId: string, role: string = 'member'): Promise<void> {
    const supabase = await createClient()

    const { error } = await supabase
        .from('users_clubs')
        .insert({
            user_id: userId,
            club_id: clubId,
            role,
            points: 0,
        })

    if (error) {
        console.error('Error joining club:', error)
        throw new Error('Failed to join club')
    }
}

/**
 * Leave a club (remove user from club membership)
 */
export async function leaveClub(userId: string, clubId: string): Promise<void> {
    const supabase = await createClient()

    const { error } = await supabase
        .from('users_clubs')
        .delete()
        .eq('user_id', userId)
        .eq('club_id', clubId)

    if (error) {
        console.error('Error leaving club:', error)
        throw new Error('Failed to leave club')
    }
}
