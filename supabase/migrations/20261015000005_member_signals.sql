-- Relationship intelligence: member_signals (master plan Phases 25-28).
--
-- member_signals is an APPEND-ONLY, club-scoped log of member activity used
-- to build per-member profiles for AI-staff personalization (Community
-- Manager onboarding drafts, AI Inbox replies, churn re-engagement).
--
-- Signal types (TEXT, open for future phases): 'posted', 'engaged',
-- 'interest', 'engagement_drop', 'milestone', 'preference'.
--
-- Privacy model:
-- - Every row carries club_id: signals never leave their club and are never
--   joined across clubs. No cross-club profiling.
-- - No PII inference: only recorded actions (posts, engagement, declared
--   preferences) — never guessed attributes (age, gender, location).
-- - RLS is enabled with NO public policies: service_role bypasses RLS,
--   anon/authenticated get nothing. Reads go through service-role code that
--   enforces club membership (requireClubRole) before returning a profile.

CREATE TABLE IF NOT EXISTS public.member_signals (
    id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,

    -- Club this signal belongs to — the hard privacy boundary
    club_id     UUID        NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,

    -- Member the signal describes
    user_id     UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,

    -- e.g. 'posted', 'engaged', 'interest', 'engagement_drop',
    --      'milestone', 'preference'
    signal_type TEXT        NOT NULL,

    -- Free-form detail, e.g. {"postId": "...", "tags": ["chess"]}
    payload     JSONB       NOT NULL DEFAULT '{}'::jsonb,

    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_member_signals_club_user_created
    ON public.member_signals (club_id, user_id, created_at DESC);

ALTER TABLE public.member_signals ENABLE ROW LEVEL SECURITY;
-- Intentionally no policies: service-role only (see header comment).
