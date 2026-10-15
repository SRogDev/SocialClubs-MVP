/**
 * Events v2 service (master plan Phases 46-52).
 *
 * CRUD for club events + RSVPs over the `events` / `event_rsvps` tables
 * (migration 20261015000008_events.sql).
 *
 * AUTHORIZATION (service-level, per AI-STAFF-READINESS.md gap #6):
 * - create / update / cancel: club owner or admin (requireClubRole).
 * - RSVP: any club member (owner/admin/moderator/member).
 *
 * Phase is derived in types/event.ts (eventPhase) — never stored.
 *
 * AI wiring: createEvent fires the `event_created` signal fire-and-forget;
 * the Experience Director drafts the announcement as pending_approval
 * (handleEventCreatedSafe swallows failures — a draft failure must never
 * break event creation).
 */
import { handleEventCreatedSafe } from '@/lib/ai/agents/experience-director';
import { requireClubRole } from '@/lib/authz';
import { createClient } from '@/lib/supabase/server';
import {
    type ClubEvent,
    type EventRsvp,
    type EventStatus,
    type RsvpStatus,
} from '@/types/event';

export interface CreateEventInput {
    club_id: string;
    title: string;
    description?: string | null;
    starts_at: string;
    ends_at: string;
    timezone?: string;
    capacity?: number | null;
}

export interface UpdateEventInput {
    title?: string;
    description?: string | null;
    starts_at?: string;
    ends_at?: string;
    timezone?: string;
    capacity?: number | null;
    status?: EventStatus;
}

export interface ListEventsOptions {
    status?: EventStatus;
    /** When true, only events that have not ended yet. */
    upcomingOnly?: boolean;
}

function validateTimes(startsAt: string, endsAt: string): void {
    const start = new Date(startsAt).getTime();
    const end = new Date(endsAt).getTime();
    if (Number.isNaN(start) || Number.isNaN(end)) {
        throw new Error('starts_at/ends_at deben ser fechas ISO válidas');
    }
    if (end <= start) {
        throw new Error('ends_at debe ser posterior a starts_at');
    }
}

function validateCapacity(capacity: number | null | undefined): void {
    if (capacity !== undefined && capacity !== null && (!Number.isInteger(capacity) || capacity <= 0)) {
        throw new Error('capacity debe ser un entero positivo o null');
    }
}

/** Raw event row; null when missing. */
async function getRawEvent(eventId: string): Promise<ClubEvent | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('id', eventId)
        .maybeSingle();
    if (error) throw new Error(`Error leyendo el evento: ${error.message}`);
    return (data as ClubEvent | null) ?? null;
}

/** Number of "going" RSVPs for an event (the only status that consumes capacity). */
async function countGoing(eventId: string): Promise<number> {
    const supabase = await createClient();
    const { count, error } = await supabase
        .from('event_rsvps')
        .select('id', { count: 'exact', head: true })
        .eq('event_id', eventId)
        .eq('status', 'going');
    if (error) throw new Error(`Error contando asistentes: ${error.message}`);
    return count ?? 0;
}

/**
 * Create an event. Owner/admin only.
 * Fires `event_created` → Experience Director drafts the announcement.
 */
export async function createEvent(input: CreateEventInput, actorId: string): Promise<ClubEvent> {
    await requireClubRole(actorId, input.club_id, ['owner', 'admin']);

    const title = input.title?.trim();
    if (!title) throw new Error('El título del evento es obligatorio');
    validateTimes(input.starts_at, input.ends_at);
    validateCapacity(input.capacity);

    const supabase = await createClient();
    const { data, error } = await supabase
        .from('events')
        .insert({
            club_id: input.club_id,
            title,
            description: input.description?.trim() || null,
            starts_at: input.starts_at,
            ends_at: input.ends_at,
            timezone: input.timezone || 'UTC',
            capacity: input.capacity ?? null,
            created_by: actorId,
        })
        .select()
        .single();

    if (error || !data) {
        throw new Error(`Error creando el evento: ${error?.message ?? 'sin datos'}`);
    }

    const event = data as ClubEvent;
    // event_created signal → announcement draft (pending_approval). Never throws.
    void handleEventCreatedSafe(event.id);
    return event;
}

/** Update an event. Owner/admin only. */
export async function updateEvent(
    eventId: string,
    patch: UpdateEventInput,
    actorId: string,
): Promise<ClubEvent> {
    const existing = await getRawEvent(eventId);
    if (!existing) throw new Error('Evento no encontrado');
    await requireClubRole(actorId, existing.club_id, ['owner', 'admin']);

    const update: Record<string, unknown> = {};
    if (patch.title !== undefined) {
        const title = patch.title.trim();
        if (!title) throw new Error('El título del evento es obligatorio');
        update.title = title;
    }
    if (patch.description !== undefined) update.description = patch.description?.trim() || null;
    if (patch.timezone !== undefined) update.timezone = patch.timezone || 'UTC';
    if (patch.capacity !== undefined) {
        validateCapacity(patch.capacity);
        update.capacity = patch.capacity ?? null;
    }
    if (patch.status !== undefined) update.status = patch.status;
    const startsAt = patch.starts_at ?? existing.starts_at;
    const endsAt = patch.ends_at ?? existing.ends_at;
    if (patch.starts_at !== undefined || patch.ends_at !== undefined) {
        validateTimes(startsAt, endsAt);
        update.starts_at = startsAt;
        update.ends_at = endsAt;
    }

    const supabase = await createClient();
    const { data, error } = await supabase
        .from('events')
        .update(update)
        .eq('id', eventId)
        .select()
        .single();

    if (error || !data) {
        throw new Error(`Error actualizando el evento: ${error?.message ?? 'sin datos'}`);
    }
    return data as ClubEvent;
}

/** Cancel an event (status → cancelled). Owner/admin only. */
export async function cancelEvent(eventId: string, actorId: string): Promise<ClubEvent> {
    return updateEvent(eventId, { status: 'cancelled' }, actorId);
}

/**
 * Get an event with attendee_count (going RSVPs) and the viewer's own RSVP.
 * No auth: visibility follows the club page (members-only clubs gate at the route).
 */
export async function getEvent(
    eventId: string,
    viewerId?: string,
): Promise<(ClubEvent & { attendee_count: number; my_rsvp: RsvpStatus | null }) | null> {
    const event = await getRawEvent(eventId);
    if (!event) return null;

    const attendee_count = await countGoing(eventId);

    let my_rsvp: RsvpStatus | null = null;
    if (viewerId) {
        const supabase = await createClient();
        const { data } = await supabase
            .from('event_rsvps')
            .select('status')
            .eq('event_id', eventId)
            .eq('user_id', viewerId)
            .maybeSingle();
        my_rsvp = ((data as { status?: RsvpStatus } | null)?.status ?? null) as RsvpStatus | null;
    }

    return { ...event, attendee_count, my_rsvp };
}

/** List a club's events, soonest first. */
export async function listClubEvents(
    clubId: string,
    opts: ListEventsOptions = {},
): Promise<ClubEvent[]> {
    const supabase = await createClient();
    let query = supabase.from('events').select('*').eq('club_id', clubId);

    if (opts.status) query = query.eq('status', opts.status);
    if (opts.upcomingOnly) query = query.gte('ends_at', new Date().toISOString());

    const { data, error } = await query.order('starts_at', { ascending: true });
    if (error) throw new Error(`Error listando eventos: ${error.message}`);
    return (data as ClubEvent[] | null) ?? [];
}

/**
 * RSVP to an event. Any club member. UNIQUE(event_id, user_id) makes this an
 * upsert: re-RSVPing with another status updates the row.
 * Only "going" consumes capacity — when the event is full, going throws.
 */
export async function rsvpEvent(
    eventId: string,
    userId: string,
    status: RsvpStatus = 'going',
): Promise<EventRsvp> {
    const event = await getRawEvent(eventId);
    if (!event) throw new Error('Evento no encontrado');
    if (event.status === 'cancelled') throw new Error('El evento fue cancelado');
    await requireClubRole(userId, event.club_id, ['owner', 'admin', 'moderator', 'member']);

    if (status === 'going' && event.capacity !== null) {
        const going = await countGoing(eventId);
        if (going >= event.capacity) {
            throw new Error('El evento está lleno');
        }
    }

    const supabase = await createClient();
    const { data, error } = await supabase
        .from('event_rsvps')
        .upsert({ event_id: eventId, user_id: userId, status }, { onConflict: 'event_id,user_id' })
        .select()
        .single();

    if (error || !data) {
        throw new Error(`Error registrando asistencia: ${error?.message ?? 'sin datos'}`);
    }
    return data as EventRsvp;
}

/** Remove the user's RSVP. Any club member (own RSVP only). */
export async function unrsvpEvent(eventId: string, userId: string): Promise<void> {
    const event = await getRawEvent(eventId);
    if (!event) throw new Error('Evento no encontrado');
    await requireClubRole(userId, event.club_id, ['owner', 'admin', 'moderator', 'member']);

    const supabase = await createClient();
    const { error } = await supabase
        .from('event_rsvps')
        .delete()
        .eq('event_id', eventId)
        .eq('user_id', userId);
    if (error) throw new Error(`Error cancelando asistencia: ${error.message}`);
}
