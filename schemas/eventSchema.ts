/**
 * Events v2 request schemas (master plan Phases 46-52).
 */
import { z } from 'zod';

const isoDateTime = z.iso.datetime({ error: 'Fecha/hora ISO inválida' });

export const createEventSchema = z.object({
    club_id: z.uuid('ID de club inválido'),
    title: z.string().min(1, 'El título es obligatorio').max(200),
    description: z.string().max(5000).optional().nullable(),
    starts_at: isoDateTime,
    ends_at: isoDateTime,
    timezone: z.string().min(1).max(64).optional().default('UTC'),
    capacity: z.number().int().positive('El cupo debe ser positivo').optional().nullable(),
});

export const updateEventSchema = z.object({
    title: z.string().min(1).max(200).optional(),
    description: z.string().max(5000).optional().nullable(),
    starts_at: isoDateTime.optional(),
    ends_at: isoDateTime.optional(),
    timezone: z.string().min(1).max(64).optional(),
    capacity: z.number().int().positive('El cupo debe ser positivo').optional().nullable(),
    status: z.enum(['draft', 'published', 'cancelled']).optional(),
});

export const rsvpSchema = z.object({
    status: z.enum(['going', 'interested', 'not_going']).default('going'),
});

export type CreateEventBody = z.infer<typeof createEventSchema>;
export type UpdateEventBody = z.infer<typeof updateEventSchema>;
export type RsvpBody = z.infer<typeof rsvpSchema>;
