-- AI governance tables (ADR-002, master plan Phases 3.1, 14, 15, 58, 59, 60).
--
-- club_ai_config:  per-club AI staff configuration: proactivity level
--                   (1=Advisor, 2=Operator, 3=Autonomous), which agents are
--                   enabled, tone, and free-form policies. Clubs without a
--                   row get L1 defaults in code (policy.ts).
-- ai_actions:       the SINGLE audit trail for every agent-proposed action:
--                   who (agent), what (action + inputs), policy result,
--                   review result, execution result, idempotency key,
--                   timestamps. The AI Inbox reads these tables — no separate store.
-- ai_action_reviews: AI + human reviews of actions (one row per review).
--
-- All tables are written with the service-role key only. RLS is enabled with
-- no public policies: service_role bypasses RLS, anon/authenticated get nothing.

CREATE TABLE IF NOT EXISTS public.club_ai_config (
    -- One row per club
    club_id           UUID        PRIMARY KEY REFERENCES public.clubs(id) ON DELETE CASCADE,

    -- 1 = Advisor (draft only), 2 = Operator, 3 = Autonomous
    proactivity_level SMALLINT    NOT NULL DEFAULT 1 CHECK (proactivity_level BETWEEN 1 AND 3),

    -- Agent ids enabled for this club (e.g. '{community-manager}')
    enabled_agents    TEXT[]      NOT NULL DEFAULT '{community-manager}',

    tone              TEXT        NOT NULL DEFAULT 'friendly',

    -- Free-form per-club policy overrides, evaluated by policy.ts
    policies          JSONB       NOT NULL DEFAULT '{}',

    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.ai_actions (
    id               UUID        DEFAULT gen_random_uuid() PRIMARY KEY,

    -- Club the action belongs to
    club_id          UUID        NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,

    -- Which staff agent proposed the action
    agent_id         TEXT        NOT NULL,

    -- Action name from ACTION_REGISTRY (lib/ai/actions.ts)
    action           TEXT        NOT NULL,

    -- Validated inputs the executor received
    inputs           JSONB       NOT NULL DEFAULT '{}',

    -- Dedup key: a duplicate key returns the original result, never re-executes
    idempotency_key  TEXT        NOT NULL UNIQUE,

    -- draft | reviewing | running | pending_approval | executed | failed | blocked | escalated
    status           TEXT        NOT NULL DEFAULT 'running',

    -- JSON snapshots of the verification pipeline stages
    policy_result    JSONB,
    review_result    JSONB,
    execution_result JSONB,

    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_actions_club_created
    ON public.ai_actions (club_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_actions_agent
    ON public.ai_actions (agent_id);
CREATE INDEX IF NOT EXISTS idx_ai_actions_status
    ON public.ai_actions (status);

CREATE TABLE IF NOT EXISTS public.ai_action_reviews (
    id            UUID        DEFAULT gen_random_uuid() PRIMARY KEY,

    action_id     UUID        NOT NULL REFERENCES public.ai_actions(id) ON DELETE CASCADE,

    -- 'ai' (reviewer-tier model call) or 'human' (AI Inbox approval)
    reviewer_type TEXT        NOT NULL,

    -- Set for human reviews; NULL for AI reviews
    reviewer_id   UUID,

    -- pass | revise | escalate | block (AI) or approved | rejected (human)
    decision      TEXT        NOT NULL,

    feedback      TEXT,

    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_action_reviews_action
    ON public.ai_action_reviews (action_id);

-- Deny-by-default: only the service role (used by lib/ai/verify.ts and
-- lib/ai/policy.ts) can touch these tables. Service role bypasses RLS;
-- these policies document intent.
ALTER TABLE public.club_ai_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_action_reviews ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'club_ai_config' AND policyname = 'club_ai_config_service_role'
    ) THEN
        CREATE POLICY club_ai_config_service_role ON public.club_ai_config
            FOR ALL TO service_role USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'ai_actions' AND policyname = 'ai_actions_service_role'
    ) THEN
        CREATE POLICY ai_actions_service_role ON public.ai_actions
            FOR ALL TO service_role USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'ai_action_reviews' AND policyname = 'ai_action_reviews_service_role'
    ) THEN
        CREATE POLICY ai_action_reviews_service_role ON public.ai_action_reviews
            FOR ALL TO service_role USING (true) WITH CHECK (true);
    END IF;
END
$$;
