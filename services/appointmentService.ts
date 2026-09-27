import { createClient } from '@/lib/supabase/server';
import type {
    CreateAppointmentSlotInput,
    UpdateAppointmentSlotInput,
} from '@/schemas/appointmentSchema';
import type { Appointment } from '@/types/appointment';

// ====================================
// APPOINTMENT SERVICE (REPOSITORY)
// CRUD for appointment slots (creator availability)
// ====================================

/**
 * Create a new appointment slot (availability)
 * Only club creators can create slots for their clubs
 */
export async function createAppointmentSlot(
    data: CreateAppointmentSlotInput,
    creatorId: string
): Promise<Appointment> {
    const supabase = await createClient();

    // Verify user is the club creator
    const { data: club, error: clubError } = await supabase
        .from('clubs')
        .select('creator')
        .eq('id', data.club_id)
        .single();

    if (clubError || !club) {
        throw new Error('Club no encontrado');
    }

    if (club.creator !== creatorId) {
        throw new Error('Solo el creador del club puede crear horarios de disponibilidad');
    }

    // Normalize time format (ensure HH:MM:SS)
    const startTime = data.start_time.length === 5 ? `${data.start_time}:00` : data.start_time;

    // Check for duplicate slot
    const { data: existing } = await supabase
        .from('vcall_appointments')
        .select('id')
        .eq('club_id', data.club_id)
        .eq('day_of_week', data.day_of_week)
        .eq('start_time', startTime)
        .eq('is_active', true)
        .maybeSingle();

    if (existing) {
        throw new Error('Ya existe un horario activo para este día y hora');
    }

    // Insert appointment slot
    const { data: appointment, error } = await supabase
        .from('vcall_appointments')
        .insert({
            club_id: data.club_id,
            creator_id: creatorId,
            day_of_week: data.day_of_week,
            start_time: startTime,
            duration: data.duration,
            price: data.price,
            timezone: data.timezone || 'UTC',
            max_bookings_per_slot: data.max_bookings_per_slot || 1,
            is_active: true,
        })
        .select()
        .single();

    if (error || !appointment) {
        throw new Error(`Error creando slot de cita: ${error?.message}`);
    }

    return appointment as Appointment;
}

/**
 * Get all appointment slots for a club
 */
export async function getClubAppointments(clubId: string, activeOnly = false): Promise<Appointment[]> {
    const supabase = await createClient();

    let query = supabase
        .from('vcall_appointments')
        .select('*')
        .eq('club_id', clubId)
        .order('day_of_week', { ascending: true })
        .order('start_time', { ascending: true });

    if (activeOnly) {
        query = query.eq('is_active', true);
    }

    const { data, error } = await query;

    if (error) {
        throw new Error(`Error obteniendo citas: ${error.message}`);
    }

    return (data || []) as Appointment[];
}

/**
 * Get a single appointment slot by ID
 */
export async function getAppointmentById(appointmentId: number): Promise<Appointment | null> {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from('vcall_appointments')
        .select('*')
        .eq('id', appointmentId)
        .single();

    if (error) {
        console.error('Error fetching appointment:', error);
        return null;
    }

    return data as Appointment;
}

/**
 * Get available slots for a specific date
 * Returns slots where bookings < max_bookings_per_slot
 */
export async function getAvailableSlots(clubId: string, date: string): Promise<Appointment[]> {
    const supabase = await createClient();

    // Get day of week from date
    const dateObj = new Date(date);
    const dayOfWeek = dateObj.getDay(); // 0=Sunday, 6=Saturday

    // Get all active slots for this day
    const { data: slots, error: slotsError } = await supabase
        .from('vcall_appointments')
        .select('*')
        .eq('club_id', clubId)
        .eq('day_of_week', dayOfWeek)
        .eq('is_active', true);

    if (slotsError || !slots) {
        throw new Error(`Error obteniendo slots: ${slotsError?.message}`);
    }

    // For each slot, count existing bookings for that date
    const availableSlots: Appointment[] = [];

    for (const slot of slots) {
        const { count } = await supabase
            .from('users_agendas')
            .select('*', { count: 'exact', head: true })
            .eq('appointment_id', slot.id)
            .eq('date', date)
            .in('status', ['pending', 'confirmed']);

        const bookingCount = count || 0;
        if (bookingCount < slot.max_bookings_per_slot) {
            availableSlots.push(slot as Appointment);
        }
    }

    return availableSlots;
}

/**
 * Update an appointment slot
 * Only the creator can update
 */
export async function updateAppointmentSlot(
    appointmentId: number,
    updates: UpdateAppointmentSlotInput,
    creatorId: string
): Promise<Appointment> {
    const supabase = await createClient();

    // Verify ownership
    const { data: appointment, error: fetchError } = await supabase
        .from('vcall_appointments')
        .select('creator_id')
        .eq('id', appointmentId)
        .single();

    if (fetchError || !appointment) {
        throw new Error('Cita no encontrada');
    }

    if (appointment.creator_id !== creatorId) {
        throw new Error('No tienes permiso para actualizar esta cita');
    }

    // Normalize time if provided
    if (updates.start_time && updates.start_time.length === 5) {
        updates.start_time = `${updates.start_time}:00`;
    }

    // Update
    const { data: updated, error } = await supabase
        .from('vcall_appointments')
        .update({
            ...updates,
            updated_at: new Date().toISOString(),
        })
        .eq('id', appointmentId)
        .select()
        .single();

    if (error || !updated) {
        throw new Error(`Error actualizando cita: ${error?.message}`);
    }

    return updated as Appointment;
}

/**
 * Delete (soft delete by marking inactive) an appointment slot
 * Only if no confirmed bookings exist
 */
export async function deleteAppointmentSlot(appointmentId: number, creatorId: string): Promise<void> {
    const supabase = await createClient();

    // Verify ownership
    const { data: appointment, error: fetchError } = await supabase
        .from('vcall_appointments')
        .select('creator_id')
        .eq('id', appointmentId)
        .single();

    if (fetchError || !appointment) {
        throw new Error('Cita no encontrada');
    }

    if (appointment.creator_id !== creatorId) {
        throw new Error('No tienes permiso para eliminar esta cita');
    }

    // Check for confirmed bookings
    const { count } = await supabase
        .from('users_agendas')
        .select('*', { count: 'exact', head: true })
        .eq('appointment_id', appointmentId)
        .in('status', ['confirmed', 'pending']);

    if ((count || 0) > 0) {
        throw new Error('No puedes eliminar una cita con reservas confirmadas o pendientes');
    }

    // Soft delete (mark as inactive)
    const { error } = await supabase
        .from('vcall_appointments')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('id', appointmentId);

    if (error) {
        throw new Error(`Error eliminando cita: ${error.message}`);
    }
}

/**
 * Get appointments by creator ID
 */
export async function getAppointmentsByCreator(creatorId: string): Promise<Appointment[]> {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from('vcall_appointments')
        .select('*')
        .eq('creator_id', creatorId)
        .order('day_of_week', { ascending: true })
        .order('start_time', { ascending: true });

    if (error) {
        throw new Error(`Error obteniendo citas: ${error.message}`);
    }

    return (data || []) as Appointment[];
}
