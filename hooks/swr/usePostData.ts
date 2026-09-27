'use client'

/**
 * Post SWR Hooks - Custom hooks para fetching (GET) de datos de posts con SWR
 * Patrón Repository: Hooks solo hacen FETCH, mutaciones van en Actions
 * Estos hooks manejan cache, revalidación automática y estados de loading/error
 * 
 * ⚠️ TODOS LOS HOOKS PENDIENTES: No hay API routes implementadas para posts
 * Solo existen las funciones en postService
 * Necesitas crear las API routes correspondientes en /app/api/posts o /app/api/clubs/[id]/posts
 */

import useSWR, { type SWRConfiguration } from 'swr'

import type { Post, PostStats, PostComment, PostInteraction } from '@/types/post'

const fetcher = async (url: string) => {
    const res = await fetch(url)
    if (!res.ok) throw new Error('Failed to fetch')
    return res.json()
}

/**
 * Hook to fetch posts from a club
 * 
 * ⚠️ PENDIENTE: Implementar GET /api/clubs/[clubId]/posts
 * Service ya existe: getPosts(clubId)
 */
export function useClubPosts(clubId: string | null, config?: SWRConfiguration) {
    const { data, error, isLoading, mutate } = useSWR<{ data: Post[] }>(
        clubId ? `/api/clubs/${clubId}/posts` : null,
        fetcher,
        {
            revalidateOnFocus: true,
            revalidateOnReconnect: true,
            refreshInterval: 10000, // Refresh every 10 seconds for live updates
            ...config,
        }
    )

    return {
        posts: data?.data,
        isLoading,
        isError: error,
        mutate,
    }
}

/**
 * Hook to fetch a single post by ID
 */
export function usePost(postId: string | null, config?: SWRConfiguration) {
    const { data, error, isLoading, mutate } = useSWR<{ data: Post }>(
        postId ? `/api/posts/${postId}` : null,
        fetcher,
        {
            revalidateOnFocus: true,
            revalidateOnReconnect: true,
            ...config,
        }
    )

    return {
        post: data?.data,
        isLoading,
        isError: error,
        mutate,
    }
}

/**
 * Hook to fetch post statistics
 */
export function usePostStats(postId: string | null, config?: SWRConfiguration) {
    const { data, error, isLoading, mutate } = useSWR<{ data: PostStats }>(
        postId ? `/api/posts/${postId}/stats` : null,
        fetcher,
        {
            revalidateOnFocus: false,
            revalidateOnReconnect: true,
            refreshInterval: 30000, // Matches Redis TTL (30s) — no benefit polling faster
            dedupingInterval: 10000,
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
 * Hook to fetch post comments
 */
export function usePostComments(postId: string | null, config?: SWRConfiguration) {
    const { data, error, isLoading, mutate } = useSWR<{ data: PostComment[] }>(
        postId ? `/api/posts/${postId}/comments` : null,
        fetcher,
        {
            revalidateOnFocus: true,
            revalidateOnReconnect: true,
            ...config,
        }
    )

    return {
        comments: data?.data,
        isLoading,
        isError: error,
        mutate,
    }
}

/**
 * Hook to fetch user's interactions with posts
 */
export function useUserPostInteractions(
    userId: string | null,
    postIds: string[] | null,
    config?: SWRConfiguration
) {
    const { data, error, isLoading, mutate } = useSWR<{ data: PostInteraction[] }>(
        userId && postIds && postIds.length > 0
            ? `/api/users/${userId}/interactions?postIds=${postIds.join(',')}`
            : null,
        fetcher,
        {
            revalidateOnFocus: false,
            revalidateOnReconnect: true,
            ...config,
        }
    )

    return {
        interactions: data?.data,
        isLoading,
        isError: error,
        mutate,
    }
}

/**
 * Hook to fetch user's posts
 */
export function useUserPosts(userId: string | null, config?: SWRConfiguration) {
    const { data, error, isLoading, mutate } = useSWR<{ data: Post[] }>(
        userId ? `/api/users/${userId}/posts` : null,
        fetcher,
        {
            revalidateOnFocus: true,
            revalidateOnReconnect: true,
            ...config,
        }
    )

    return {
        posts: data?.data,
        isLoading,
        isError: error,
        mutate,
    }
}

/**
 * Hook to fetch trending posts
 */
export function useTrendingPosts(config?: SWRConfiguration) {
    const { data, error, isLoading, mutate } = useSWR<{ data: Post[] }>(
        '/api/posts/trending',
        fetcher,
        {
            revalidateOnFocus: false,
            revalidateOnReconnect: true,
            refreshInterval: 60000, // Refresh every minute
            dedupingInterval: 30000, // Dedupe requests within 30 seconds
            ...config,
        }
    )

    return {
        posts: data?.data,
        isLoading,
        isError: error,
        mutate,
    }
}
