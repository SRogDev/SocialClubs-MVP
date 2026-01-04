'use client';

import useSWR from 'swr';
import type { BookingWithAppointment } from '@/types/appointment';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface UseBookingsOptions {
    clubId?: string;
    status?: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';
    fromDate?: string; // YYYY-MM-DD
    toDate?: string; // YYYY-MM-DD
}

/**
 * Hook to fetch bookings for the current user
 * @param options - Filter options
 */
export function useUserBookings(options?: UseBookingsOptions) {
    const params = new URLSearchParams();

    if (options?.status) params.append('status', options.status);
    if (options?.fromDate) params.append('from_date', options.fromDate);
    if (options?.toDate) params.append('to_date', options.toDate);

    const queryString = params.toString();
    const url = `/api/bookings${queryString ? `?${queryString}` : ''}`;

    const { data, error, isLoading, mutate } = useSWR<{
        success: boolean;
        data: BookingWithAppointment[];
    }>(url, fetcher, {
        refreshInterval: 30000, // Refresh every 30 seconds
        revalidateOnFocus: true,
    });

    return {
        bookings: data?.data || [],
        isLoading,
        isError: error,
        mutate,
    };
}

/**
 * Hook to fetch bookings for a club (creator view)
 * @param clubId - Club UUID
 * @param options - Filter options
 */
export function useClubBookings(clubId: string | null, options?: UseBookingsOptions) {
    const params = new URLSearchParams();

    if (clubId) params.append('club_id', clubId);
    if (options?.status) params.append('status', options.status);
    if (options?.fromDate) params.append('from_date', options.fromDate);
    if (options?.toDate) params.append('to_date', options.toDate);

    const queryString = params.toString();
    const url = clubId ? `/api/bookings?${queryString}` : null;

    const { data, error, isLoading, mutate } = useSWR<{
        success: boolean;
        data: BookingWithAppointment[];
    }>(url, fetcher, {
        refreshInterval: 30000, // Refresh every 30 seconds
        revalidateOnFocus: true,
    });

    return {
        bookings: data?.data || [],
        isLoading,
        isError: error,
        mutate,
    };
}

/**
 * Hook to fetch upcoming bookings (confirmed, future dates)
 */
export function useUpcomingBookings() {
    const today = new Date().toISOString().split('T')[0];

    return useUserBookings({
        status: 'confirmed',
        fromDate: today,
    });
}
