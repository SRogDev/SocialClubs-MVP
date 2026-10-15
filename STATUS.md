# STATUS — SocialClubs-MVP

> Single source of truth for where this project stands. Last updated: 2026-10-15.
> Read this before starting work. Update it in the same PR when reality changes.

## Done
- 2026-09-26 — Repo made public (SRogDev/SocialClubs-MVP) per Roger's request.
- 2026-09-26 — Reform strategic note locked (see brief).
- 2026-10-15 — Phases 25–28 relationship intelligence shipped: append-only club-scoped `member_signals` table (migration `20261015000005_member_signals.sql`, service-role RLS) + `lib/ai/relationship.ts` (record/aggregate/churn heuristic, no PII inference) + fire-and-forget signal recording in `services/postService.ts` + Community Manager drafts (`draftOnboarding`, `draftSignalResponse`) with member-profile context + `GET /api/ai/member/[userId]/profile` (club-member auth). 19/19 new unit tests.
- 2026-10-15 — Phases 29–33 AI moderation shipped (`lib/ai/moderation.ts`): layered pipeline — L1 deterministic (blocklist, link-spam, ALL-CAPS; always on, zero cost) → L2 AI classifier via `invokeAgent` (only for L1 "suspicious", only when `AI_MODERATION` on). Verdict→action: clean→none, suspicious→flagged_for_review, violation→hide_proposed (pending draft for the AI Inbox; the AI NEVER auto-hides at L1). Fail-open to human review on any classifier failure. Every classification audited to `moderation_events` (migration `20261015000006_moderation.sql`, service-role RLS) + `GET /api/ai/moderation/events` (staff roles) + fire-and-forget wiring in `services/postService.ts`. 14/14 new unit tests.
- 2026-10-15 — Phases 34–37, 39–40 Creator Copilot shipped (`lib/ai/creator-copilot.ts`, `lib/ai/club-context.ts`): drafts-only creator assistant — `draftPost` (title+body+tags, tone selector, grounded in club name + recent post topics from Supabase, fail-soft), `suggestTags` (deterministic candidates + AI refinement), `improvePost` (returns `{ improved, changes[] }`); budget enforced pre-call via `invokeAgent`; `POST /api/ai/copilot/draft-post` + `POST /api/ai/copilot/improve` (owner/admin auth, rate-limited, AI_BUDGET_EXCEEDED → 402); Spanish-first `components/ai/CopilotPanel.tsx` mounted as a "Copiloto IA" button on the creator's `ContentCreationBar`. The AI NEVER auto-publishes — drafts return to the creator; publishing stays manual. 10/10 new unit tests.

## In progress / blocked
- Reform planning — dedicated side chat. Next step: write the major reform plan.

## Next
- Reform per locked strategy: standalone-first, Polygrow-enhanced via clean seams; remove club-agent architecture.
