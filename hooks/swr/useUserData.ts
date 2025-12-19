'use client'

/**
 * User/Profile SWR Hooks - Custom hooks para fetching (GET) de datos de usuarios con SWR
 * Patrón Repository: Hooks solo hacen FETCH, mutaciones van en Actions
 * Estos hooks manejan cache, revalidación automática y estados de loading/error
 */

import useSWR, { type SWRConfiguration } from 'swr'
import type { User, UserPoints, UserClubMembership } from '@/types/user'

const fetcher = async (url: string) => {
    const res = await fetch(url)
    if (!res.ok) throw new Error('Failed to fetch')
    return res.json()
}

/**
 * Hook to fetch current authenticated user
 * 
 * ⚠️ PENDIENTE: Implementar GET /api/users/me
 * Service ya existe: getCurrentUser()
 */
export function useCurrentUser(config?: SWRConfiguration) {
    const { data, error, isLoading, mutate } = useSWR<{ data: User }>(
        '/api/users/me',
        fetcher,
        {
            revalidateOnFocus: true,
            revalidateOnReconnect: true,
            ...config,
        }
    )

    return {
        user: data?.data,
        isLoading,
        isError: error,
        mutate,
    }
}

/**
 * Hook to fetch user profile by ID
 * 
 * ⚠️ PENDIENTE: Implementar GET /api/users/[userId]
 * Service ya existe: getUserProfile(id)
 */
export function useUser(userId: string | null, config?: SWRConfiguration) {
    const { data, error, isLoading, mutate } = useSWR<{ data: User }>(
        userId ? `/api/users/${userId}` : null,
        fetcher,
        {
            revalidateOnFocus: false,
            revalidateOnReconnect: true,
            ...config,
        }
    )

    return {
        user: data?.data,
        isLoading,
        isError: error,
        mutate,
    }
}

/**
 * Hook to fetch user profile by username
 * 
 * ⚠️ PENDIENTE: Implementar GET /api/users/username/[username]
 * Service ya existe: getUserByUsername(username)
 */
export function useUserByUsername(username: string | null, config?: SWRConfiguration) {
    const { data, error, isLoading, mutate } = useSWR<{ data: User }>(
        username ? `/api/users/username/${username}` : null,
        fetcher,
        {
            revalidateOnFocus: false,
            revalidateOnReconnect: true,
            ...config,
        }
    )

    return {
        user: data?.data,
        isLoading,
        isError: error,
        mutate,
    }
}

/**
 * Hook to fetch user points (superlikes, coins, etc.)
 * 
 * ⚠️ PENDIENTE: Implementar GET /api/users/[userId]/points
 * Service ya existe: getUserPoints(userId)
 */
export function useUserPoints(userId: string | null, config?: SWRConfiguration) {
    const { data, error, isLoading, mutate } = useSWR<{ data: UserPoints }>(
        userId ? `/api/users/${userId}/points` : null,
        fetcher,
        {
            revalidateOnFocus: true,
            revalidateOnReconnect: true,
            refreshInterval: 30000,
            ...config,
        }
    )

    return {
        points: data?.data,
        isLoading,
        isError: error,
        mutate,
    }
}

/**
 * Hook to fetch user club memberships
 * 
 * ⚠️ PENDIENTE: Implementar GET /api/users/[userId]/memberships
 * Service ya existe: getUserClubMemberships(userId)
 */
export function useUserMemberships(userId: string | null, config?: SWRConfiguration) {
    const { data, error, isLoading, mutate } = useSWR<{ data: UserClubMembership[] }>(
        userId ? `/api/users/${userId}/memberships` : null,
        fetcher,
        {
            revalidateOnFocus: true,
            revalidateOnReconnect: true,
            ...config,
        }
    )

    return {
        memberships: data?.data,
        isLoading,
        isError: error,
        mutate,
    }
}

// useUsernameAvailability ELIMINADO
// No es necesario - Supabase maneja la unicidad del campo username a nivel de DB
// El error de username duplicado se capturará al hacer updateProfile
