'use client';

import { useState } from 'react';

import { useToast } from '@/hooks/use-toast';
import type { CreateBookingInput, CancelBookingInput } from '@/schemas/appointmentSchema';

/**
 * Hook for booking actions (create, cancel)
 */
export function useBookingActions() {
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();

    /**
     * Create a new booking (will redirect to Stripe checkout)
     */
    const createBooking = async (data: CreateBookingInput) => {
        setIsLoading(true);
        try {
            const response = await fetch('/api/stripe/checkout-booking', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Error creando reserva');
            }

            // Redirect to Stripe checkout
            if (result.checkout_url) {
                window.location.href = result.checkout_url;
            } else {
                // If Stripe not implemented, show message
                toast({
                    title: '⚠️ Stripe pendiente',
                    description: result.error || 'La integración de pagos aún no está completa',
                    variant: 'destructive',
                });
            }

            return result;
        } catch (error: any) {
            toast({
                title: '❌ Error',
                description: error.message,
                variant: 'destructive',
            });
            throw error;
        } finally {
            setIsLoading(false);
        }
    };

    /**
     * Cancel a booking
     */
    const cancelBooking = async (bookingId: number, reason?: string) => {
        setIsLoading(true);
        try {
            const response = await fetch('/api/bookings', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ booking_id: bookingId, reason }),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Error cancelando reserva');
            }

            toast({
                title: '✅ Reserva cancelada',
                description: 'La reserva fue cancelada exitosamente',
            });

            return result.data;
        } catch (error: any) {
            toast({
                title: '❌ Error',
                description: error.message,
                variant: 'destructive',
            });
            throw error;
        } finally {
            setIsLoading(false);
        }
    };

    /**
     * Create a videocall room manually (for testing or direct access)
     */
    const createRoom = async (bookingId: number) => {
        setIsLoading(true);
        try {
            const response = await fetch('/api/videocall/create-room', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ booking_id: bookingId }),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Error creando room');
            }

            toast({
                title: '✅ Room creada',
                description: 'La videollamada está lista',
            });

            return result.data;
        } catch (error: any) {
            toast({
                title: '❌ Error',
                description: error.message,
                variant: 'destructive',
            });
            throw error;
        } finally {
            setIsLoading(false);
        }
    };

    return {
        createBooking,
        cancelBooking,
        createRoom,
        isLoading,
    };
}
