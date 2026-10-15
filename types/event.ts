/**
 * Events v2 types (master plan Phases 46-52).
 *
 * Phase is ALWAYS derived from timestamps via `eventPhase` — never stored
 * (audit: docs/delta-audit/AI-STAFF-READINESS.md § Event system).
 */
export type EventPhase = 'PRE_EVENT' | 'LIVE' | 'POST_EVENT' | 'EXPIRED';

export type EventStatus = 'draft' | 'published' | 'cancelled';

export type RsvpStatus = 'going' | 'interested' | 'not_going';

export const EVENT_STATUSES: readonly EventStatus[] = ['draft', 'published', 'cancelled'];
export const RSVP_STATUSES: readonly RsvpStatus[] = ['going', 'interested', 'not_going'];

export interface ClubEvent {
    id: string;
    club_id: string;
    title: string;
    description: string | null;
    /** ISO 8601 UTC instant. */
    starts_at: string;
    /** ISO 8601 UTC instant. */
    ends_at: string;
    /** IANA timezone for display (e.g. "America/Havana"). */
    timezone: string;
    /** Max "going" RSVPs; null = unlimited. */
    capacity: number | null;
    status: EventStatus;
    created_by: string | null;
    created_at: string;
    /** Populated by getEvent: number of "going" RSVPs. */
    attendee_count?: number;
    /** Populated by getEvent(viewerId): viewer's own RSVP. */
    my_rsvp?: RsvpStatus | null;
}

export interface EventRsvp {
    id: string;
    event_id: string;
    user_id: string;
    status: RsvpStatus;
    created_at: string;
}

/** POST_EVENT lasts 7 days after ends_at; then the event is EXPIRED. */
export const POST_EVENT_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Derive the event phase from timestamps. Pure function — phase is never
 * persisted, so it can never go stale.
 *
 * Boundaries: starts_at <= now <= ends_at is LIVE (inclusive both ends);
 * now == ends_at + 7d is EXPIRED (window is exclusive).
 */
export function eventPhase(
    event: Pick<ClubEvent, 'starts_at' | 'ends_at'>,
    now: Date = new Date(),
): EventPhase {
    const start = new Date(event.starts_at).getTime();
    const end = new Date(event.ends_at).getTime();
    const t = now.getTime();
    if (t < start) return 'PRE_EVENT';
    if (t <= end) return 'LIVE';
    if (t < end + POST_EVENT_WINDOW_MS) return 'POST_EVENT';
    return 'EXPIRED';
}

/** Spanish-first UI label for a phase. */
export function phaseLabel(phase: EventPhase): string {
    switch (phase) {
        case 'PRE_EVENT':
            return 'Próximo';
        case 'LIVE':
            return 'En vivo';
        case 'POST_EVENT':
        case 'EXPIRED':
            return 'Finalizado';
    }
}
