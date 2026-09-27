'use client';

import useSWR from 'swr';

import type { Appointment } from '@/types/appointment';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

/**
 * Hook to fetch appointment slots for a club
 * @param clubId - Club UUID
 * @param activeOnly - Only fetch active slots (default: true)
 */
export function useAppointments(clubId: string | null, activeOnly = true) {
    const { data, error, isLoading, mutate } = useSWR<{
        success: boolean;
        data: Appointment[];
    }>(clubId ? `/api/appointments?club_id=${clubId}` : null, fetcher, {
        refreshInterval: 30000, // Refresh every 30 seconds
        revalidateOnFocus: true,
    });

    return {
        appointments: data?.data || [],
        isLoading,
        isError: error,
        mutate,
    };
}

/**
 * Hook to fetch available slots for a specific date
 * @param clubId - Club UUID
 * @param date - Date in YYYY-MM-DD format
 */
export function useAvailableSlots(clubId: string | null, date: string | null) {
    const shouldFetch = clubId && date;

    const { data, error, isLoading, mutate } = useSWR<{
        success: boolean;
        data: Appointment[];
    }>(
        shouldFetch ? `/api/appointments?club_id=${clubId}&date=${date}` : null,
        fetcher,
        {
            refreshInterval: 0, // Don't auto-refresh (user-triggered)
            revalidateOnFocus: false,
        }
    );

    return {
        availableSlots: data?.data || [],
        isLoading,
        isError: error,
        mutate,
    };
}
