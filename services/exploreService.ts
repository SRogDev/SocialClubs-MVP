/**
 * Explore Service - Functions for explore page
 */

import { cache } from 'react'

import { createClient } from '@/lib/supabase/server'
import type { Club } from '@/types/club'

/**
 * Get featured clubs (clubs with highest member count)
 * @returns Promise<Club[]>
 */
export const getFeaturedClubs = cache(async (): Promise<Club[]> => {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('clubs')
        .select('*')
        .order('total_members', { ascending: false })
        .limit(10)

    if (error) {
        console.error('Error fetching featured clubs:', error)
        throw new Error('Failed to fetch featured clubs')
    }

    return data || []
})

/**
 * Get all clubs for explore feed
 * Returns up to 45 real clubs, newest first. No mock data — an empty
 * result is honest and the UI renders an empty state.
 * @returns Promise<Club[]>
 */
export const getAllClubs = cache(async (): Promise<Club[]> => {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('clubs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(45)

    if (error) {
        console.error('Error fetching all clubs:', error)
        throw new Error('Failed to fetch all clubs')
    }

    return data || []
})
