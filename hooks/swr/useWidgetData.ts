import useSWR from 'swr'

import type { ResolvedWidgetData } from '@/types/widget'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

/**
 * Fetch and revalidate widget data for a published widget post.
 * Returns the full resolved widget (widget meta + club_widget + key-value dataMap).
 */
export function useWidgetData(clubWidgetId: string | null | undefined) {
    const { data, error, isLoading, mutate } = useSWR<ResolvedWidgetData>(
        clubWidgetId ? `/api/widgets/${clubWidgetId}` : null,
        fetcher,
        { refreshInterval: 15_000 } // poll every 15s for live updates
    )

    return { data, error, isLoading, mutate }
}
