import { createClient } from '@/lib/supabase/server';
import type { Booking, BookingWithAppointment } from '@/types/appointment';
import type { CreateBookingInput, CancelBookingInput, GetBookingsInput } from '@/schemas/appointmentSchema';
import { getAppointmentById } from './appointmentService';

// ====================================
// BOOKING SERVICE (REPOSITORY)
// CRUD for user bookings/reservations
// ====================================

/**
 * Create a new booking (reservation)
 * Called after successful Stripe payment
 */
export async function createBooking(
    data: CreateBookingInput,
    userId: string,
    paymentId?: string
): Promise<Booking> {
    const supabase = await createClient();

    // Get appointment details
    const appointment = await getAppointmentById(data.appointment_id);
    if (!appointment) {
        throw new Error('Cita no encontrada');
    }

    if (!appointment.is_active) {
        throw new Error('Esta cita ya no está disponible');
    }

    // Check if slot is available for this date
    const { count } = await supabase
        .from('users_agendas')
        .select('*', { count: 'exact', head: true })
        .eq('appointment_id', data.appointment_id)
        .eq('date', data.date)
        .in('status', ['pending', 'confirmed']);

    const bookingCount = count || 0;
    if (bookingCount >= appointment.max_bookings_per_slot) {
        throw new Error('No hay cupos disponibles para esta fecha y hora');
    }

    // Check for duplicate booking by same user
    const { data: existingBooking } = await supabase
        .from('users_agendas')
        .select('id')
        .eq('user_id', userId)
        .eq('appointment_id', data.appointment_id)
        .eq('date', data.date)
        .in('status', ['pending', 'confirmed'])
        .maybeSingle();

    if (existingBooking) {
        throw new Error('Ya tienes una reserva para esta fecha y hora');
    }

    // Calculate start and end times
    const startTime = appointment.start_time;
    const [hours, minutes] = startTime.split(':').map(Number);
    const endMinutes = minutes + appointment.duration;
    const endHours = hours + Math.floor(endMinutes / 60);
    const endMins = endMinutes % 60;
    const endTime = `${String(endHours).padStart(2, '0')}:${String(endMins).padStart(2, '0')}:00`;

    // Create booking
    const { data: booking, error } = await supabase
        .from('users_agendas')
        .insert({
            user_id: userId,
            club_id: appointment.club_id,
            appointment_id: data.appointment_id,
            date: data.date,
            start_time: startTime,
            end_time: endTime,
            price: appointment.price,
            payment_id: paymentId || null,
            status: paymentId ? 'confirmed' : 'pending',
            call_room_created: false,
        })
        .select()
        .single();

    if (error || !booking) {
        throw new Error(`Error creando reserva: ${error?.message}`);
    }

    return booking as Booking;
}

/**
 * Get bookings for a user
 */
export async function getUserBookings(
    userId: string,
    filters?: GetBookingsInput
): Promise<BookingWithAppointment[]> {
    const supabase = await createClient();

    let query = supabase
        .from('users_agendas')
        .select(
            `
      *,
      appointment:vcall_appointments(*),
      club:clubs(id, name, creator)
    `
        )
        .eq('user_id', userId)
        .order('date', { ascending: false })
        .order('start_time', { ascending: false });

    if (filters?.status) {
        query = query.eq('status', filters.status);
    }

    if (filters?.from_date) {
        query = query.gte('date', filters.from_date);
    }

    if (filters?.to_date) {
        query = query.lte('date', filters.to_date);
    }

    const { data, error } = await query;

    if (error) {
        throw new Error(`Error obteniendo reservas: ${error.message}`);
    }

    return (data || []) as BookingWithAppointment[];
}

/**
 * Get bookings for a club (for creator to see their schedule)
 */
export async function getClubBookings(
    clubId: string,
    filters?: GetBookingsInput
): Promise<BookingWithAppointment[]> {
    const supabase = await createClient();

    let query = supabase
        .from('users_agendas')
        .select(
            `
      *,
      appointment:vcall_appointments(*),
      user:users(id, name, username, avatar_url)
    `
        )
        .eq('club_id', clubId)
        .order('date', { ascending: true })
        .order('start_time', { ascending: true });

    if (filters?.status) {
        query = query.eq('status', filters.status);
    }

    if (filters?.from_date) {
        query = query.gte('date', filters.from_date);
    }

    if (filters?.to_date) {
        query = query.lte('date', filters.to_date);
    }

    const { data, error } = await query;

    if (error) {
        throw new Error(`Error obteniendo reservas del club: ${error.message}`);
    }

    return (data || []) as BookingWithAppointment[];
}

/**
 * Get a single booking by ID
 */
export async function getBookingById(bookingId: number): Promise<BookingWithAppointment | null> {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from('users_agendas')
        .select(
            `
      *,
      appointment:vcall_appointments(*),
      club:clubs(id, name, creator),
      user:users(id, name, username, avatar_url)
    `
        )
        .eq('id', bookingId)
        .single();

    if (error) {
        console.error('Error fetching booking:', error);
        return null;
    }

    return data as BookingWithAppointment;
}

/**
 * Get upcoming bookings that need rooms created
 * Used by cron job to detect appointments that should start soon
 */
export async function getUpcomingBookings(timeWindowMinutes = 5): Promise<BookingWithAppointment[]> {
    const supabase = await createClient();

    const now = new Date();
    const currentDate = now.toISOString().split('T')[0]; // YYYY-MM-DD
    const currentTime = now.toTimeString().split(' ')[0]; // HH:MM:SS

    // Calculate time window
    const futureTime = new Date(now.getTime() + timeWindowMinutes * 60 * 1000);
    const futureTimeStr = futureTime.toTimeString().split(' ')[0];

    // Find bookings:
    // - date = today
    // - start_time between now and now+windowMinutes
    // - status = confirmed
    // - call_room_created = false
    const { data, error } = await supabase
        .from('users_agendas')
        .select(
            `
      *,
      appointment:vcall_appointments(*),
      club:clubs(id, name, creator),
      user:users(id, name, username, avatar_url)
    `
        )
        .eq('date', currentDate)
        .eq('status', 'confirmed')
        .eq('call_room_created', false)
        .gte('start_time', currentTime)
        .lte('start_time', futureTimeStr);

    if (error) {
        console.error('Error fetching upcoming bookings:', error);
        return [];
    }

    return (data || []) as BookingWithAppointment[];
}

/**
 * Cancel a booking
 * Can only cancel if not already completed or if room hasn't been created
 */
export async function cancelBooking(
    data: CancelBookingInput,
    userId: string
): Promise<Booking> {
    const supabase = await createClient();

    // Get booking
    const { data: booking, error: fetchError } = await supabase
        .from('users_agendas')
        .select('*, club:clubs(creator)')
        .eq('id', data.booking_id)
        .single();

    if (fetchError || !booking) {
        throw new Error('Reserva no encontrada');
    }

    // Check permissions (user or club creator can cancel)
    if (booking.user_id !== userId && (booking.club as any).creator !== userId) {
        throw new Error('No tienes permiso para cancelar esta reserva');
    }

    // Check if can be cancelled
    if (booking.status === 'completed') {
        throw new Error('No puedes cancelar una reserva ya completada');
    }

    if (booking.status === 'cancelled') {
        throw new Error('Esta reserva ya fue cancelada');
    }

    if (booking.call_room_created) {
        throw new Error('No puedes cancelar una reserva cuya videollamada ya inició');
    }

    // Update booking
    const { data: updated, error } = await supabase
        .from('users_agendas')
        .update({
            status: 'cancelled',
            cancelled_at: new Date().toISOString(),
            cancelled_by: userId,
            updated_at: new Date().toISOString(),
        })
        .eq('id', data.booking_id)
        .select()
        .single();

    if (error || !updated) {
        throw new Error(`Error cancelando reserva: ${error?.message}`);
    }

    // TODO: Process refund via Stripe if applicable

    return updated as Booking;
}

/**
 * Confirm a pending booking (after payment)
 */
export async function confirmBooking(bookingId: number, paymentId: string): Promise<Booking> {
    const supabase = await createClient();

    const { data: booking, error } = await supabase
        .from('users_agendas')
        .update({
            status: 'confirmed',
            payment_id: paymentId,
            updated_at: new Date().toISOString(),
        })
        .eq('id', bookingId)
        .eq('status', 'pending')
        .select()
        .single();

    if (error || !booking) {
        throw new Error(`Error confirmando reserva: ${error?.message}`);
    }

    return booking as Booking;
}

/**
 * Mark booking as completed
 */
export async function completeBooking(bookingId: number): Promise<void> {
    const supabase = await createClient();

    const { error } = await supabase
        .from('users_agendas')
        .update({
            status: 'completed',
            updated_at: new Date().toISOString(),
        })
        .eq('id', bookingId);

    if (error) {
        throw new Error(`Error completando reserva: ${error.message}`);
    }
}
