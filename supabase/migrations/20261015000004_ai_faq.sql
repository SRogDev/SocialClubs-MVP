-- Community Manager v0: document the FAQ contract inside club_ai_config.policies
-- (master plan Phases 4-7). The FAQ entries themselves are configured via the
-- AI Inbox (next phase); this migration only documents the shape that
-- lib/ai/agents/community-manager.ts answerFAQ() reads:
--
--   policies.faq = [ { "q": "question text", "a": "answer text" }, ... ]
--
-- answerFAQ() answers ONLY from these entries (anti-hallucination) and returns
-- { answer: null, reason: 'no_faq_configured' } when the array is missing,
-- malformed, or empty. No schema change is needed: policies is already JSONB.

COMMENT ON COLUMN public.club_ai_config.policies IS
'Free-form per-club policy overrides, evaluated by lib/ai/policy.ts. Recognized keys: faq — array of {"q","a"} objects consumed by lib/ai/agents/community-manager.ts answerFAQ(), which answers ONLY from these entries (anti-hallucination). Configure the FAQ via the AI Inbox.';
