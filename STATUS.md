# STATUS — SocialClubs-MVP

> Single source of truth for where this project stands. Last updated: 2026-10-15.
> Read this before starting work. Update it in the same PR when reality changes.

## Done
- 2026-09-26 — Repo made public (SRogDev/SocialClubs-MVP) per Roger's request.
- 2026-09-26 — Reform strategic note locked (see brief).
- 2026-10-15 — Phases 25–28 relationship intelligence shipped: append-only club-scoped `member_signals` table (migration `20261015000005_member_signals.sql`, service-role RLS) + `lib/ai/relationship.ts` (record/aggregate/churn heuristic, no PII inference) + fire-and-forget signal recording in `services/postService.ts` + Community Manager drafts (`draftOnboarding`, `draftSignalResponse`) with member-profile context + `GET /api/ai/member/[userId]/profile` (club-member auth). 19/19 new unit tests.

## In progress / blocked
- Reform planning — dedicated side chat. Next step: write the major reform plan.

## Next
- Reform per locked strategy: standalone-first, Polygrow-enhanced via clean seams; remove club-agent architecture.
