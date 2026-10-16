-- ============================================================================
-- MIGRATION: is_demo marker on clubs (demo seed path, 2026-10-15)
-- ============================================================================
--
-- WHY THIS MIGRATION:
--
-- The demo seed path (scripts/seed-demo.ts + scripts/clean-demo.ts, see
-- docs/DEMO.md) creates a "Club Demo" with Spanish content for
-- recruiter/investor walkthroughs. Demo data must be CLEARLY marked and
-- removable without touching production data — this is Roger's explicit
-- requirement: "a clearly-marked demo seed path (no fake production data)".
--
-- DESIGN:
--
-- · `clubs.is_demo` is the single source of truth for the marker. All other
--   seeded rows (posts, polls, events, ai_actions, member_signals,
--   moderation_events, club_ai_config, memberships, widget instances) belong
--   to a demo club and are deleted by ON DELETE CASCADE when the club is
--   deleted, so `scripts/clean-demo.ts` is one DELETE statement.
--
-- · Demo USERS are marked by the email domain `@demo.socialclubs` (we cannot
--   add columns to auth.users; public.users has no email column). The clean
--   script lists auth users via the Admin API and deletes the ones matching
--   the domain, plus their public.users rows.
--
-- · Default FALSE, additive, no behavior change for existing rows.
--
-- ============================================================================

ALTER TABLE public.clubs
    ADD COLUMN IF NOT EXISTS is_demo BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN public.clubs.is_demo IS
'TRUE only for clubs created by scripts/seed-demo.ts (demo walkthrough data). Demo clubs + all their cascading content are removed by scripts/clean-demo.ts. NEVER set on real clubs.';

CREATE INDEX IF NOT EXISTS idx_clubs_is_demo ON public.clubs (is_demo) WHERE is_demo;
