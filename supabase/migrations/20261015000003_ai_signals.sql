-- AI signal/trigger layer (master plan Phase 19).
--
-- ai_signals: durable, deduplicated event rows connecting product events
-- (new post, member joined, points milestone) to the AI staff. Product code
-- persists a row via lib/ai/signals.ts emitSignal(); the QStash worker
-- (POST /api/queues/ai-signals) loads the row, routes it to the owning
-- agent (SIGNAL_ROUTING), and runs the agent's chosen action through the
-- governance pipeline (verifyAndExecute).
--
-- dedup_key is unique: emitSignal skips a repeated key inside a 24h window
-- and re-arms the row (fresh created_at, cleared processed_at) afterwards.
-- processed_at is set by the worker once the signal has been handled, so a
-- redelivered QStash message is an idempotent no-op.
--
-- Written with the service-role key only. RLS is enabled with no public
-- policies: service_role bypasses RLS, anon/authenticated get nothing.

CREATE TABLE IF NOT EXISTS public.ai_signals (
    id                UUID        DEFAULT gen_random_uuid() PRIMARY KEY,

    -- Signal type, e.g. 'new_post' | 'member_joined' | 'points_milestone'
    type              TEXT        NOT NULL,

    -- Club the signal belongs to
    club_id           UUID        NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,

    -- Event-specific data (ids, thresholds, excerpts). The worker's
    -- SIGNAL_ROUTING composes agent action inputs from this object.
    payload           JSONB       NOT NULL DEFAULT '{}'::jsonb,

    -- Dedup identity, e.g. 'new_post:<postId>'. Unique: repeats inside the
    -- 24h window are skipped by emitSignal.
    dedup_key         TEXT        NOT NULL UNIQUE,

    -- Set by the worker once the signal has been routed + verified.
    processed_at      TIMESTAMPTZ,

    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_signals_club_created
    ON public.ai_signals (club_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_signals_unprocessed
    ON public.ai_signals (created_at)
    WHERE processed_at IS NULL;

-- Deny-by-default: only the service role (used by lib/ai/signals.ts) can
-- touch this table. Service role bypasses RLS; this policy documents intent.
ALTER TABLE public.ai_signals ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'ai_signals' AND policyname = 'ai_signals_service_role'
    ) THEN
        CREATE POLICY ai_signals_service_role ON public.ai_signals
            FOR ALL TO service_role USING (true) WITH CHECK (true);
    END IF;
END
$$;
