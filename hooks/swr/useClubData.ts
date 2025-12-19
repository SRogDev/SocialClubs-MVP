'use client'

/**
 * Club SWR Hooks - Custom hooks para fetching (GET) de datos de clubs con SWR
 * Patrón Repository: Hooks solo hacen FETCH, mutaciones van en Actions
 * Estos hooks manejan cache, revalidación automática y estados de loading/error
 */

import useSWR, { type SWRConfiguration } from 'swr'
import type { Club, ClubStats } from '@/types/club'
import type { User } from '@/types/user'

const fetcher = async (url: string) => {
    const res = await fetch(url)
    if (!res.ok) throw new Error('Failed to fetch')
    return res.json()
}

/**
 * Hook to fetch all clubs
 * 
 * ⚠️ PENDIENTE: Requiere implementar GET /api/clubs
 * Actualmente solo existe POST /api/clubs (crear) y DELETE /api/clubs/[id]
 * 
 * Para implementar:
 * 1. Crear GET handler en /app/api/clubs/route.ts
 * 2. Llamar a getClubs() de clubService
 */
export function useClubs(config?: SWRConfiguration) {
    const { data, error, isLoading, mutate } = useSWR<{ data: Club[] }>(
        '/api/clubs',
        fetcher,
        {
            revalidateOnFocus: true,
            revalidateOnReconnect: true,
            ...config,
        }
    )

    return {
        clubs: data?.data,
        isLoading,
        isError: error,
        mutate,
    }
}

/**
 * Hook to fetch a single club by ID
 * 
 * ⚠️ PENDIENTE: Requiere implementar GET /api/clubs/[id]
 * Actualmente solo existe DELETE /api/clubs/[id]
 * 
 * Para implementar:
 * 1. Crear GET handler en /app/api/clubs/[id]/route.ts
 * 2. Llamar a getClubById(id) de clubService
 */
export function useClub(clubId: string | null, config?: SWRConfiguration) {
    const { data, error, isLoading, mutate } = useSWR<{ data: Club }>(
        clubId ? `/api/clubs/${clubId}` : null,
        fetcher,
        {
            revalidateOnFocus: true,
            revalidateOnReconnect: true,
            ...config,
        }
    )

    return {
        club: data?.data,
        isLoading,
        isError: error,
        mutate,
    }
}

/**
 * Hook to fetch user's clubs (clubs the user is a member of)
 * 
 * ⚠️ PENDIENTE: Requiere implementar GET /api/users/[userId]/clubs
 * 
 * Para implementar:
 * 1. Crear /app/api/users/[userId]/clubs/route.ts
 * 2. Llamar a getUserClubs(userId) de clubService
 */
export function useUserClubs(userId: string | null, config?: SWRConfiguration) {
    const { data, error, isLoading, mutate } = useSWR<{ data: Club[] }>(
        userId ? `/api/users/${userId}/clubs` : null,
        fetcher,
        {
            revalidateOnFocus: true,
            revalidateOnReconnect: true,
            ...config,
        }
    )

    return {
        clubs: data?.data,
        isLoading,
        isError: error,
        mutate,
    }
}

/**
 * Hook to fetch club statistics
 * 
 * ⚠️ PENDIENTE: Requiere implementar GET /api/clubs/[clubId]/stats
 * Service ya existe: getClubStats(clubId)
 */
export function useClubStats(clubId: string | null, config?: SWRConfiguration) {
    const { data, error, isLoading, mutate } = useSWR<{ data: ClubStats }>(
        clubId ? `/api/clubs/${clubId}/stats` : null,
        fetcher,
        {
            revalidateOnFocus: false,
            revalidateOnReconnect: true,
            refreshInterval: 30000,
            ...config,
        }
    )

    return {
        stats: data?.data,
        isLoading,
        isError: error,
        mutate,
    }
}

/**
 * Hook to fetch club members
 * 
 * ⚠️ PENDIENTE: Requiere implementar GET /api/clubs/[clubId]/members
 * Service: Puede usar query directo a users_clubs con join a users
 */
export function useClubMembers(clubId: string | null, config?: SWRConfiguration) {
    const { data, error, isLoading, mutate } = useSWR<{ data: User[] }>(
        clubId ? `/api/clubs/${clubId}/members` : null,
        fetcher,
        {
            revalidateOnFocus: false,
            revalidateOnReconnect: true,
            ...config,
        }
    )

    return {
        members: data?.data,
        isLoading,
        isError: error,
        mutate,
    }
}

/**
 * Hook to check if user is a member of a club
 * 
 * ⚠️ PENDIENTE: Requiere implementar GET /api/clubs/[clubId]/members/[userId]
 * Service ya existe: isUserClubMember(userId, clubId)
 */
export function useIsMember(
    clubId: string | null,
    userId: string | null,
    config?: SWRConfiguration
) {
    const { data, error, isLoading, mutate } = useSWR<{ data: { isMember: boolean } }>(
        clubId && userId ? `/api/clubs/${clubId}/members/${userId}` : null,
        fetcher,
        {
            revalidateOnFocus: true,
            revalidateOnReconnect: true,
            ...config,
        }
    )

    return {
        isMember: data?.data?.isMember ?? false,
        isLoading,
        isError: error,
        mutate,
    }
}

/**
 * Hook to fetch featured clubs for explore page
 * 
 * ⚠️ PENDIENTE: Requiere implementar GET /api/clubs/featured
 * Service ya existe: getFeaturedClubs() en exploreService
 */
export function useFeaturedClubs(config?: SWRConfiguration) {
    const { data, error, isLoading, mutate } = useSWR<{ data: Club[] }>(
        '/api/clubs/featured',
        fetcher,
        {
            revalidateOnFocus: false,
            revalidateOnReconnect: true,
            dedupingInterval: 60000,
            ...config,
        }
    )

    return {
        clubs: data?.data,
        isLoading,
        isError: error,
        mutate,
    }
}
