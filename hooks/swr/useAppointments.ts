import useSWR from 'swr';

import type { Appointment } from '@/types/database';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

/**
 * useAppointments Hook
 * 
 * Fetches appointment slots for a specific club.
 * Used for displaying available time slots for videocalls.
 * 
 * @param clubId - Club UUID
 * @returns SWR response with appointments array
 * 
 * @example
 * const { data, error, isLoading, mutate } = useAppointments(clubId);
 */
export function useAppointments(clubId: string) {
    const { data, error, isLoading, mutate } = useSWR<{
        success: boolean;
        appointments: Appointment[];
    }>(clubId ? `/api/appointments?club_id=${clubId}` : null, fetcher, {
        revalidateOnFocus: false,
        dedupingInterval: 60000, // 1 minuto
    });

    return {
        appointments: data?.appointments || [],
        isLoading,
        isError: error,
        mutate,
    };
}

/**
 * useAppointment Hook
 * 
 * Fetches a single appointment by ID.
 * Used for appointment detail pages.
 * 
 * @param appointmentId - Appointment ID
 * @returns SWR response with appointment object
 */
export function useAppointment(appointmentId: number | null) {
    const { data, error, isLoading, mutate } = useSWR<{
        success: boolean;
        appointment: Appointment;
    }>(
        appointmentId ? `/api/appointments/${appointmentId}` : null,
        fetcher,
        {
            revalidateOnFocus: false,
        }
    );

    return {
        appointment: data?.appointment,
        isLoading,
        isError: error,
        mutate,
    };
}
