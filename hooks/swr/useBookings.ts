import useSWR from 'swr';
import { Booking } from '@/types/database';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

/**
 * useBookings Hook
 * 
 * Fetches user's videocall bookings.
 * Can filter by user, club, or status.
 * 
 * @param params - Query parameters
 * @returns SWR response with bookings array
 * 
 * @example
 * // Get all user bookings
 * const { bookings } = useBookings({ user_id: userId });
 * 
 * // Get bookings for specific club
 * const { bookings } = useBookings({ club_id: clubId });
 * 
 * // Get only confirmed bookings
 * const { bookings } = useBookings({ status: 'confirmed' });
 */
export function useBookings(params?: {
    user_id?: string;
    club_id?: string;
    status?: string;
}) {
    const queryParams = new URLSearchParams();
    if (params?.user_id) queryParams.set('user_id', params.user_id);
    if (params?.club_id) queryParams.set('club_id', params.club_id);
    if (params?.status) queryParams.set('status', params.status);

    const queryString = queryParams.toString();

    const { data, error, isLoading, mutate } = useSWR<{
        success: boolean;
        bookings: Booking[];
    }>(queryString ? `/api/bookings?${queryString}` : null, fetcher, {
        revalidateOnFocus: true,
        refreshInterval: 30000, // Refresh cada 30s para bookings
    });

    return {
        bookings: data?.bookings || [],
        isLoading,
        isError: error,
        mutate,
    };
}

/**
 * useBooking Hook
 * 
 * Fetches a single booking by ID.
 * Used for booking detail and confirmation pages.
 * 
 * @param bookingId - Booking ID
 * @returns SWR response with booking object
 */
export function useBooking(bookingId: number | null) {
    const { data, error, isLoading, mutate } = useSWR<{
        success: boolean;
        booking: Booking;
    }>(bookingId ? `/api/bookings/${bookingId}` : null, fetcher, {
        revalidateOnFocus: true,
    });

    return {
        booking: data?.booking,
        isLoading,
        isError: error,
        mutate,
    };
}
