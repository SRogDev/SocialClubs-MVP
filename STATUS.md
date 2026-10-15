# STATUS — SocialClubs-MVP

> Single source of truth for where this project stands. Last updated: 2026-10-15.
> Read this before starting work. Update it in the same PR when reality changes.

## Done
- 2026-09-26 — Repo made public (SRogDev/SocialClubs-MVP) per Roger's request.
- 2026-09-26 — Reform strategic note locked (see brief).
- 2026-10-15 — Phase 3.2 shared AI runtime shipped (`lib/ai/`): AIsa client + deterministic mock, tier→model routing, static price table, per-club budgets (`ai_usage`/`ai_budgets` migration), env feature flags (all default OFF), `invokeAgent` with zod output validation. 34/34 unit tests. Design: `docs/adr/ADR-001-ai-runtime.md`.
- 2026-10-15 — AI governance shipped (master plan Phases 3.1, 14, 15, 58, 59, 60): `lib/ai/actions.ts` (10-action registry), `proactivity.ts` (risk×level permission matrix), `policy.ts` (per-club `evaluatePolicy`, deny by default), `verify.ts` (schema→permission→policy→AI reviewer→human approval→execute→audit pipeline with idempotency), `agents.ts` (3 staff agents at L1 + reviewer definition), migration `20261015000002_ai_governance.sql` (`club_ai_config`, `ai_actions`, `ai_action_reviews`). v1 executors are honest stubs except `escalate_to_human`/`notify_creator` (real `ai_actions` writes). 76/76 AI unit tests. Design: `docs/adr/ADR-002-ai-governance.md`.
- 2026-10-06 — Catch-up complete (5 PRs #5–#9): agent architecture deleted, mocks removed, pending GET routes implemented, OSS hygiene (MIT, public), landing repositioned for creators/influencers.
- 2026-10-15 — AI-first master plan approved by Roger (84 phases). Delta audit done: `docs/delta-audit/AI-STAFF-READINESS.md`. Execution order: shared AI runtime (AIsa) → governance → signals → Community Manager → AI Inbox → intelligence → experiences.

## In progress
- AI staff foundation — `lib/ai/` runtime + governance (actions registry, policy, verification pipeline, agent definitions). Next: signals → Community Manager → AI Inbox.

## Next
- Reform per locked strategy: standalone-first, Polygrow-enhanced via clean seams; remove club-agent architecture.
