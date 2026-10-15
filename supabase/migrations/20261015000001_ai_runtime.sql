-- AI runtime cost-control tables (ADR-001 §3, master plan Phase 3.2).
--
-- ai_usage:    append-only log of every LLM call (per club, agent, workflow,
--              model): tokens in/out, estimated USD cost, latency, mock flag.
-- ai_budgets:  per-club monthly spend cap. Rows auto-create on first use with
--              the default cap from AI_MONTHLY_BUDGET_USD_DEFAULT ($5).
--              When spent_usd >= monthly_cap_usd the runtime throws
--              AI_BUDGET_EXCEEDED *before* calling the model.
--
-- Both tables are written with the service-role key only. RLS is enabled with
-- no public policies: service_role bypasses RLS, anon/authenticated get nothing.

CREATE TABLE IF NOT EXISTS public.ai_usage (
    id                UUID        DEFAULT gen_random_uuid() PRIMARY KEY,

    -- Club that was billed for this call
    club_id           UUID        NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,

    -- Which agent ran, and for which workflow/signal type
    agent_id          TEXT        NOT NULL,
    workflow          TEXT        NOT NULL,

    -- Model actually called (env-resolved id, e.g. "openai/gpt-4o-mini")
    model             TEXT        NOT NULL,

    -- Token accounting as reported by the provider (0/0 for the mock)
    prompt_tokens     INTEGER     NOT NULL DEFAULT 0,
    completion_tokens INTEGER     NOT NULL DEFAULT 0,

    -- Estimated cost in USD (static price table in lib/ai/pricing.ts)
    cost_usd          NUMERIC(12, 6) NOT NULL DEFAULT 0,

    latency_ms        INTEGER     NOT NULL DEFAULT 0,

    -- True when the deterministic mock answered (no key, no spend)
    mock              BOOLEAN     NOT NULL DEFAULT false,

    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_usage_club_created
    ON public.ai_usage (club_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_usage_agent
    ON public.ai_usage (agent_id);

CREATE TABLE IF NOT EXISTS public.ai_budgets (
    -- One row per club
    club_id          UUID         PRIMARY KEY REFERENCES public.clubs(id) ON DELETE CASCADE,

    monthly_cap_usd  NUMERIC(10, 2) NOT NULL,
    spent_usd        NUMERIC(12, 6) NOT NULL DEFAULT 0,

    -- First day of the current billing period (YYYY-MM-DD); spend resets
    -- when the calendar month rolls over.
    period_start     DATE         NOT NULL,

    -- Kill switch: a disabled budget blocks all AI calls for the club.
    disabled         BOOLEAN      NOT NULL DEFAULT false,

    updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Deny-by-default: only the service role (used by lib/ai/cost.ts) can touch
-- these tables. Service role bypasses RLS; these policies document intent.
ALTER TABLE public.ai_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_budgets ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'ai_usage' AND policyname = 'ai_usage_service_role'
    ) THEN
        CREATE POLICY ai_usage_service_role ON public.ai_usage
            FOR ALL TO service_role USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'ai_budgets' AND policyname = 'ai_budgets_service_role'
    ) THEN
        CREATE POLICY ai_budgets_service_role ON public.ai_budgets
            FOR ALL TO service_role USING (true) WITH CHECK (true);
    END IF;
END
$$;
