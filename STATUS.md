# STATUS — SocialClubs-MVP

> Single source of truth for where this project stands. Last updated: 2026-10-15.
> Read this before starting work. Update it in the same PR when reality changes.

## Done
- 2026-09-26 — Repo made public (SRogDev/SocialClubs-MVP) per Roger's request.
- 2026-09-26 — Reform strategic note locked (see brief).
- 2026-10-15 — Phase 3.2 shared AI runtime shipped (`lib/ai/`): AIsa client + deterministic mock, tier→model routing, static price table, per-club budgets (`ai_usage`/`ai_budgets` migration), env feature flags (all default OFF), `invokeAgent` with zod output validation. 34/34 unit tests. Design: `docs/adr/ADR-001-ai-runtime.md`.
- 2026-10-15 — AI governance shipped (master plan Phases 3.1, 14, 15, 58, 59, 60): `lib/ai/actions.ts` (10-action registry), `proactivity.ts` (risk×level permission matrix), `policy.ts` (per-club `evaluatePolicy`, deny by default), `verify.ts` (schema→permission→policy→AI reviewer→human approval→execute→audit pipeline with idempotency), `agents.ts` (3 staff agents at L1 + reviewer definition), migration `20261015000002_ai_governance.sql` (`club_ai_config`, `ai_actions`, `ai_action_reviews`). v1 executors are honest stubs except `escalate_to_human`/`notify_creator` (real `ai_actions` writes). 76/76 AI unit tests. Design: `docs/adr/ADR-002-ai-governance.md`.
- 2026-10-15 — AI signal/trigger layer shipped (master plan Phase 19): `lib/ai/signals.ts` (`emitSignal` with 24h dedup, `SIGNAL_ROUTING`), `lib/ai/signal-dispatch.ts` (persist + fire-and-forget QStash), worker `POST /api/queues/ai-signals`, migration `20261015000003_ai_signals.sql` (`ai_signals`).
- 2026-10-15 — Community Manager v0 shipped (master plan Phases 4, 5, 6, 7, 10, 16, 20, 21): first visible AI staff member, L1 Advisor (draft-only). `lib/ai/agents/community-manager.ts` — `answerFAQ` (grounded in `club_ai_config.policies.faq`, "No lo sé" when uncovered, `no_faq_configured` without an LLM call), `draftOnboarding` (welcome draft via `send_message`), `draftSignalResponse` (`new_post` → `comment_post` draft, `member_joined` → onboarding draft). Worker routes the two signal types to the agent-composed drafts; `POST /api/ai/faq` (member auth, 20/min/IP) + "Pregunta al club" widget (`components/ai/AskClub.tsx`, Spanish-first, AI disclosure + "no estoy seguro" state) on the club home page. Migration `20261015000004_ai_faq.sql` documents the `policies.faq` contract. 106/106 AI unit tests (8 new).
- 2026-10-06 — Catch-up complete (5 PRs #5–#9): agent architecture deleted, mocks removed, pending GET routes implemented, OSS hygiene (MIT, public), landing repositioned for creators/influencers.
- 2026-10-15 — AI-first master plan approved by Roger (84 phases). Delta audit done: `docs/delta-audit/AI-STAFF-READINESS.md`. Execution order: shared AI runtime (AIsa) → governance → signals → Community Manager → AI Inbox → intelligence → experiences.

## In progress
- Community Manager v0 is live — next: AI Inbox (approve/reject the drafts in `ai_actions`), then intelligence/experiences.

## Next
- Reform per locked strategy: standalone-first, Polygrow-enhanced via clean seams; remove club-agent architecture.
