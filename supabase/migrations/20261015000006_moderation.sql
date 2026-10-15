-- ============================================================================
-- MIGRATION: AI moderation events (master plan Phases 29-33)
-- Date: 2026-10-15
-- ============================================================================
--
-- WHY THIS MIGRATION:
--
-- The delta audit (docs/delta-audit/AI-STAFF-READINESS.md) found moderation to
-- be manual and club-level only: `club_reports` targets clubs, not posts or
-- comments, and nothing classifies content automatically.
--
-- SOLUTION:
--
-- · Table `moderation_events`: append-only audit of every content
--   classification made by the layered moderation pipeline in
--   `lib/ai/moderation.ts` (L1 deterministic -> L2 AI classifier).
--
-- · Verdict -> action mapping is enforced in code (`actionForVerdict`), not
--   in the DB:
--     clean      -> 'none'              (nothing happens)
--     suspicious -> 'flagged_for_review' (queued for a human)
--     violation  -> 'hide_proposed'     (a PENDING hide draft for the AI Inbox;
--                                        nothing is hidden or deleted at L1)
--
-- · The AI never auto-hides or auto-deletes content: there is deliberately
--   NO 'hide_executed' action. The AI Inbox (future UI) reads rows with
--   action_taken IN ('flagged_for_review', 'hide_proposed') and a human
--   approves or dismisses them there.
--
-- · RLS is enabled with NO permissive policies: rows are written/read only
--   via the service-role key (the moderation pipeline runs server-side;
--   reads go through `GET /api/ai/moderation/events`, which enforces
--   owner/admin/moderator club roles).
--
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.moderation_events (
    id               UUID        DEFAULT gen_random_uuid() PRIMARY KEY,

    -- Club whose content was classified (budgets + scoping).
    club_id          UUID        NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,

    -- What was classified.
    target_type      TEXT        NOT NULL CHECK (target_type IN ('post', 'comment')),
    target_id        UUID        NOT NULL,

    -- Classification outcome.
    verdict          TEXT        NOT NULL CHECK (verdict IN ('clean', 'suspicious', 'violation')),
    layer            TEXT        NOT NULL CHECK (layer IN ('deterministic', 'ai')),
    reasons          JSONB       NOT NULL DEFAULT '[]'::jsonb,

    -- What the pipeline did about it (never an executed hide at L1).
    action_taken     TEXT        NOT NULL
        CHECK (action_taken IN ('none', 'flagged_for_review', 'hide_proposed')),

    created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Moderation queue reads: newest first per club.
CREATE INDEX IF NOT EXISTS moderation_events_club_created_idx
    ON public.moderation_events (club_id, created_at DESC);

-- Correlate all classifications of one piece of content.
CREATE INDEX IF NOT EXISTS moderation_events_target_idx
    ON public.moderation_events (target_type, target_id);

-- Service-role only: no public policies. Enable RLS so anon/authenticated
-- keys cannot touch the table even if a key leaks into client code.
ALTER TABLE public.moderation_events ENABLE ROW LEVEL SECURITY;
