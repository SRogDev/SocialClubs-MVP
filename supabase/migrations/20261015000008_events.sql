-- Events v2 + Experience Director foundation (master plan Phases 46-52).
--
-- events:      club events with starts_at/ends_at TIMESTAMPTZ, an IANA
--              `timezone` label for display, optional `capacity`, and a
--              draft/published/cancelled lifecycle. Phase (PRE_EVENT / LIVE /
--              POST_EVENT / EXPIRED) is ALWAYS derived in code from the
--              timestamps — never stored, so it cannot go stale.
-- event_rsvps: participation signal + capacity. UNIQUE(event_id, user_id)
--              makes RSVP an upsert: re-RSVPing updates the row.
--
-- Both tables are written with the service-role key only (the app calls them
-- through services/eventService.ts, which enforces club roles). RLS is
-- enabled with no public policies: service_role bypasses RLS,
-- anon/authenticated get nothing.

CREATE TABLE IF NOT EXISTS public.events (
    id          UUID         DEFAULT gen_random_uuid() PRIMARY KEY,

    club_id     UUID         NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
    title       TEXT         NOT NULL,
    description TEXT,

    starts_at   TIMESTAMPTZ  NOT NULL,
    ends_at     TIMESTAMPTZ  NOT NULL,
    -- IANA timezone for display (e.g. "America/Havana"). Instants stay UTC.
    timezone    TEXT         NOT NULL DEFAULT 'UTC',

    -- Max "going" RSVPs; NULL = unlimited.
    capacity    INT,

    status      TEXT         NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'published', 'cancelled')),

    created_by  UUID         REFERENCES public.users(id) ON DELETE SET NULL,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CHECK (ends_at > starts_at),
    CHECK (capacity IS NULL OR capacity > 0)
);

CREATE INDEX IF NOT EXISTS idx_events_club_starts
    ON public.events (club_id, starts_at);

CREATE INDEX IF NOT EXISTS idx_events_club_status
    ON public.events (club_id, status);

CREATE TABLE IF NOT EXISTS public.event_rsvps (
    id          UUID         DEFAULT gen_random_uuid() PRIMARY KEY,

    event_id    UUID         NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    user_id     UUID         NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,

    status      TEXT         NOT NULL DEFAULT 'going'
        CHECK (status IN ('going', 'interested', 'not_going')),

    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    UNIQUE (event_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_event_rsvps_event_status
    ON public.event_rsvps (event_id, status);

CREATE INDEX IF NOT EXISTS idx_event_rsvps_user
    ON public.event_rsvps (user_id);

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_rsvps ENABLE ROW LEVEL SECURITY;
-- No policies: service_role (used by the app services) bypasses RLS;
-- anon/authenticated get nothing.
