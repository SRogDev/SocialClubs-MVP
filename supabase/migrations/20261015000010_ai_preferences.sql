-- AI member control (master plan Phases 73-76).
--
-- ai_member_preferences:
--   Per-member, per-club AI consent switches. Defaults are opt-IN (both
--   true); the member must explicitly toggle them off in their profile.
--   - allow_personalization = false -> getMemberProfileWithConsent returns
--     an empty profile; AI staff writes general, non-personalized drafts.
--   - allow_proactive_messages = false -> the delivery seam
--     (lib/ai/workflow-delivery.ts) skips proactive sends/notifications
--     to that member.
--
-- The governance audit trail (ai_actions) already exists
-- (20261015000002_ai_governance.sql) and is written by the verification
-- pipeline (lib/ai/verify.ts); this migration only adds member control.
--
-- Written with the service-role key only. RLS is enabled with no public
-- policies: service_role bypasses RLS, anon/authenticated get nothing
-- (same deny-by-default pattern as the other AI tables).

CREATE TABLE IF NOT EXISTS public.ai_member_preferences (
    user_id                   UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    club_id                   UUID        NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,

    allow_personalization     BOOLEAN     NOT NULL DEFAULT true,
    allow_proactive_messages  BOOLEAN     NOT NULL DEFAULT true,

    updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    PRIMARY KEY (user_id, club_id)
);

CREATE INDEX IF NOT EXISTS idx_ai_member_preferences_club
    ON public.ai_member_preferences (club_id);

-- Deny-by-default: only the service role (used by
-- lib/ai/member-control.ts) can touch this table. Service role bypasses
-- RLS; this policy documents intent.
ALTER TABLE public.ai_member_preferences ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'ai_member_preferences' AND policyname = 'ai_member_preferences_service_role'
    ) THEN
        CREATE POLICY ai_member_preferences_service_role ON public.ai_member_preferences
            FOR ALL TO service_role USING (true) WITH CHECK (true);
    END IF;
END
$$;
