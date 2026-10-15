-- AI memory + correction feedback loops (master plan Phases 63-66).
--
-- ai_memory:   club-scoped + agent-scoped key/value memories the AI staff
--              learns over time (creator preferences, corrected mistakes).
--              One row per (club_id, agent_id, key) — upserts replace the
--              value so memories converge instead of piling up. Agents load
--              these rows into their prompt context ("memory" section), so a
--              correction today prevents the same mistake tomorrow.
--
-- ai_feedback: append-only log of creator feedback on AI-staff output
--              ('correction' | 'praise' | 'flag'). Corrections are distilled
--              into ai_memory rows by lib/ai/memory.ts (recordFeedback).
--              `action_id` references the reviewed `ai_actions` row
--              (migration 20261015000002_ai_governance.sql).
--
-- Privacy model:
-- - Every memory is scoped to one club AND one agent: memories never leave
--   their club and are never joined across clubs. No cross-club profiling.
-- - Never store raw user PII in memories: lib/ai/memory.ts redacts emails
--   and phone numbers before persisting (store preferences/patterns, not
--   names/emails).
-- - RLS is enabled with NO public policies: service_role bypasses RLS,
--   anon/authenticated get nothing. Reads/writes go through service-role
--   code that enforces club roles (owner/admin) before returning memories.

CREATE TABLE IF NOT EXISTS public.ai_memory (
    id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,

    -- Club this memory belongs to — the hard privacy boundary
    club_id     UUID        NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,

    -- Which staff agent this memory applies to ('community-manager',
    -- 'experience-director', 'creator-copilot', ...)
    agent_id    TEXT        NOT NULL,

    -- Stable preference key, e.g. 'correction-tone', 'praise-title'
    key         TEXT        NOT NULL,

    -- The learned preference, e.g. {"preference": "playful, not corporate",
    -- "polarity": "avoid"}
    value       JSONB       NOT NULL DEFAULT '{}'::jsonb,

    -- Where the memory came from: 'correction' (creator corrected the AI),
    -- 'learned' (creator praised / AI distilled), 'config' (explicitly set)
    source      TEXT        NOT NULL DEFAULT 'learned'
        CHECK (source IN ('correction', 'learned', 'config')),

    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE (club_id, agent_id, key)
);

CREATE INDEX IF NOT EXISTS idx_ai_memory_club_agent
    ON public.ai_memory (club_id, agent_id);

CREATE TABLE IF NOT EXISTS public.ai_feedback (
    id            UUID        DEFAULT gen_random_uuid() PRIMARY KEY,

    -- The reviewed ai_actions row (the AI Inbox records feedback against
    -- the action the creator approved/rejected)
    action_id     UUID        REFERENCES public.ai_actions(id) ON DELETE CASCADE,

    -- 'correction' (creator fixed the AI -> distilled into ai_memory),
    -- 'praise' (approved output -> stored as a learned preference),
    -- 'flag' (reported output -> logged, no memory created)
    feedback_type TEXT        NOT NULL
        CHECK (feedback_type IN ('correction', 'praise', 'flag')),

    -- Free-form feedback text as written by the creator (may be empty)
    content       TEXT        NOT NULL DEFAULT '',

    -- Creator who gave the feedback
    created_by    UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,

    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_feedback_action
    ON public.ai_feedback (action_id);
CREATE INDEX IF NOT EXISTS idx_ai_feedback_created_by
    ON public.ai_feedback (created_by);

ALTER TABLE public.ai_memory ENABLE ROW LEVEL SECURITY;
-- Intentionally no policies: service-role only (see header comment).
ALTER TABLE public.ai_feedback ENABLE ROW LEVEL SECURITY;
-- Intentionally no policies: service-role only (see header comment).
