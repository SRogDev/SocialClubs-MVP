/**
 * SWR Hooks for Notifications
 *
 * Flujo: Client Component → useNotifications() → fetch('/api/notifications') → API Route → Service
 *
 * ⚠️ SOLO para FETCH (GET). Mutaciones van en /app/actions/notificationActions.ts
 */

import useSWR from 'swr'
import useSWRInfinite from 'swr/infinite'

import type { Notification } from '@/types/notification'

// ---------------------------------------------------------------------------
// Fetcher
// ---------------------------------------------------------------------------

const fetcher = async (url: string) => {
    const res = await fetch(url)
    if (!res.ok) {
        const error = await res.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(error.error ?? 'Error fetching notifications')
    }
    return res.json()
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface NotificationsResponse {
    notifications: Notification[]
    nextCursor: string | null
    unreadCount: number
}

// ---------------------------------------------------------------------------
// useNotifications — paginated infinite scroll
// ---------------------------------------------------------------------------

export function useNotifications(options?: { unreadOnly?: boolean; category?: string }) {
    const { unreadOnly, category } = options ?? {}

    const getKey = (pageIndex: number, previousPageData: NotificationsResponse | null) => {
        // First page
        if (pageIndex === 0) {
            const params = new URLSearchParams()
            if (unreadOnly) params.set('unread_only', 'true')
            if (category) params.set('category', category)
            return `/api/notifications?${params.toString()}`
        }

        // No more pages
        if (!previousPageData?.nextCursor) return null

        const params = new URLSearchParams()
        params.set('cursor', previousPageData.nextCursor)
        if (unreadOnly) params.set('unread_only', 'true')
        if (category) params.set('category', category)
        return `/api/notifications?${params.toString()}`
    }

    const { data, error, isLoading, isValidating, size, setSize, mutate } =
        useSWRInfinite<NotificationsResponse>(getKey, fetcher, {
            revalidateOnFocus: true,
            revalidateFirstPage: true,
            refreshInterval: 30_000, // Poll every 30s for new notifications
        })

    const notifications = data?.flatMap((page) => page.notifications) ?? []
    const unreadCount = data?.[0]?.unreadCount ?? 0
    const hasMore = data ? data[data.length - 1]?.nextCursor !== null : false
    const isLoadingMore = isLoading || (size > 0 && data && typeof data[size - 1] === 'undefined')

    return {
        notifications,
        unreadCount,
        hasMore,
        isLoading,
        isLoadingMore,
        isValidating,
        error,
        loadMore: () => setSize(size + 1),
        mutate,
    }
}

// ---------------------------------------------------------------------------
// useUnreadNotificationCount — lightweight hook for nav badges
// ---------------------------------------------------------------------------

export function useUnreadNotificationCount() {
    const { data, error, mutate } = useSWR<NotificationsResponse>(
        '/api/notifications?limit=1',
        fetcher,
        {
            revalidateOnFocus: true,
            refreshInterval: 15_000, // Poll every 15s
            dedupingInterval: 10_000,
        }
    )

    return {
        count: data?.unreadCount ?? 0,
        isLoading: !data && !error,
        error,
        mutate,
    }
}
