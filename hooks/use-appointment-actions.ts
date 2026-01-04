'use client';

import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import type { CreateAppointmentSlotInput, UpdateAppointmentSlotInput } from '@/schemas/appointmentSchema';

/**
 * Hook for appointment CRUD actions
 */
export function useAppointmentActions() {
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();

    /**
     * Create a new appointment slot
     */
    const createAppointment = async (data: CreateAppointmentSlotInput) => {
        setIsLoading(true);
        try {
            const response = await fetch('/api/appointments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Error creando horario');
            }

            toast({
                title: '✅ Horario creado',
                description: 'El horario de disponibilidad fue creado exitosamente',
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
     * Update an appointment slot
     */
    const updateAppointment = async (appointmentId: number, updates: UpdateAppointmentSlotInput) => {
        setIsLoading(true);
        try {
            const response = await fetch(`/api/appointments/${appointmentId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Error actualizando horario');
            }

            toast({
                title: '✅ Horario actualizado',
                description: 'El horario fue actualizado exitosamente',
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
     * Delete an appointment slot
     */
    const deleteAppointment = async (appointmentId: number) => {
        setIsLoading(true);
        try {
            const response = await fetch(`/api/appointments/${appointmentId}`, {
                method: 'DELETE',
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Error eliminando horario');
            }

            toast({
                title: '✅ Horario eliminado',
                description: 'El horario fue eliminado exitosamente',
            });

            return true;
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
        createAppointment,
        updateAppointment,
        deleteAppointment,
        isLoading,
    };
}
