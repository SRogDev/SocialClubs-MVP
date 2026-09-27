/**
 * Club Hooks - Custom hooks for club operations with PostHog tracking
 */

'use client'

import posthog from 'posthog-js'
import { useState } from 'react'

import type { CreateClubInput } from '@/schemas/clubSchema'
import type { Club } from '@/types/club'

interface UseClubCreateResult {
    createClub: (input: CreateClubInput) => Promise<Club>
    loading: boolean
    error: string | null
}

interface UseClubDeleteResult {
    deleteClub: (clubId: string) => Promise<void>
    loading: boolean
    error: string | null
}

/**
 * Hook for creating clubs with PostHog tracking
 */
export function useClubCreate(): UseClubCreateResult {
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const createClub = async (input: CreateClubInput): Promise<Club> => {
        setLoading(true)
        setError(null)

        try {
            const response = await fetch('/api/clubs', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(input),
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.message || 'Failed to create club')
            }

            // Capture PostHog event on success (client-side only)
            if (response.status === 200 && data.data) {
                posthog.capture('club_created', {
                    club_id: data.data.id,
                    club_name: data.data.name,
                    privacy: data.data.privacity,
                    has_description: !!data.data.bio,
                })
            }

            return data.data
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to create club'
            setError(errorMessage)
            throw err
        } finally {
            setLoading(false)
        }
    }

    return { createClub, loading, error }
}

/**
 * Hook for deleting clubs with PostHog tracking
 */
export function useClubDelete(): UseClubDeleteResult {
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const deleteClub = async (clubId: string): Promise<void> => {
        setLoading(true)
        setError(null)

        try {
            const response = await fetch(`/api/clubs/${clubId}`, {
                method: 'DELETE',
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.message || 'Failed to delete club')
            }

            // Capture PostHog event on success (client-side only)
            if (response.status === 200) {
                posthog.capture('club_deleted', {
                    club_id: clubId,
                })
            }
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to delete club'
            setError(errorMessage)
            throw err
        } finally {
            setLoading(false)
        }
    }

    return { deleteClub, loading, error }
}
