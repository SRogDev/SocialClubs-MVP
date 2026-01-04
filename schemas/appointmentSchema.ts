import { z } from 'zod';

// ====================================
// APPOINTMENT SCHEMAS (Slot Creation)
// ====================================

export const createAppointmentSlotSchema = z.object({
    club_id: z.string().uuid('ID de club inválido'),
    day_of_week: z
        .number()
        .int('Día de la semana debe ser un número entero')
        .min(0, 'Día de la semana debe ser entre 0 (Domingo) y 6 (Sábado)')
        .max(6, 'Día de la semana debe ser entre 0 (Domingo) y 6 (Sábado)'),
    start_time: z
        .string()
        .regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/, 'Formato de hora inválido (HH:MM o HH:MM:SS)'),
    duration: z
        .number()
        .int('Duración debe ser un número entero')
        .min(15, 'Duración mínima: 15 minutos')
        .max(180, 'Duración máxima: 180 minutos'),
    price: z
        .number()
        .int('Precio debe ser un número entero')
        .min(0, 'Precio mínimo: $0')
        .max(1000000, 'Precio máximo: $10,000'),
    timezone: z.string().optional().default('UTC'),
    max_bookings_per_slot: z.number().int().min(1).max(10).optional().default(1),
});

export const updateAppointmentSlotSchema = z.object({
    day_of_week: z.number().int().min(0).max(6).optional(),
    start_time: z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/).optional(),
    duration: z.number().int().min(15).max(180).optional(),
    price: z.number().int().min(0).max(1000000).optional(),
    is_active: z.boolean().optional(),
    max_bookings_per_slot: z.number().int().min(1).max(10).optional(),
});

export const getAvailableSlotsSchema = z.object({
    club_id: z.string().uuid(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de fecha inválido (YYYY-MM-DD)'),
});

// ====================================
// BOOKING SCHEMAS (User Reservations)
// ====================================

export const createBookingSchema = z
    .object({
        appointment_id: z.number().int().positive('ID de appointment inválido'),
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de fecha inválido (YYYY-MM-DD)'),
        user_timezone: z.string().optional().default('UTC'),
    })
    .refine(
        (data) => {
            const bookingDate = new Date(data.date);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            return bookingDate >= today;
        },
        {
            message: 'La fecha de reserva debe ser hoy o en el futuro',
            path: ['date'],
        }
    );

export const cancelBookingSchema = z.object({
    booking_id: z.number().int().positive(),
    reason: z.string().optional(),
});

export const getBookingsSchema = z.object({
    user_id: z.string().uuid().optional(),
    club_id: z.string().uuid().optional(),
    status: z.enum(['pending', 'confirmed', 'completed', 'cancelled', 'no_show']).optional(),
    from_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    to_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

// ====================================
// VIDEOCALL ROOM SCHEMAS
// ====================================

export const createVideocallRoomSchema = z.object({
    booking_id: z.number().int().positive('ID de booking inválido'),
});

export const getRoomSchema = z.object({
    room_id: z.number().int().positive().optional(),
    booking_id: z.number().int().positive().optional(),
    room_name: z.string().optional(),
});

// Type inference
export type CreateAppointmentSlotInput = z.infer<typeof createAppointmentSlotSchema>;
export type UpdateAppointmentSlotInput = z.infer<typeof updateAppointmentSlotSchema>;
export type CreateBookingInput = z.infer<typeof createBookingSchema>;
export type CancelBookingInput = z.infer<typeof cancelBookingSchema>;
export type GetBookingsInput = z.infer<typeof getBookingsSchema>;
export type CreateVideocallRoomInput = z.infer<typeof createVideocallRoomSchema>;
export type GetRoomInput = z.infer<typeof getRoomSchema>;
