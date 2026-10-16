# SocialClubs AI-first execution log

## Phase 1 — Delta audit (docs)
- PR: https://github.com/SRogDev/SocialClubs-MVP/pull/10
- Merge SHA: 581191c
- Shipped: docs/delta-audit/AI-STAFF-READINESS.md, docs/adr/ADR-001-ai-runtime.md, docs/adr/ADR-002-ai-governance.md; STATUS.md updated; AGENTS.md stale line fixed; README touch-up.
- Tests: docs-only, N/A.
- Next: shared AI runtime (Phase 3.2).

## Phase 3.2 — Shared AI runtime (in progress)
- Builder: active. Scope: lib/ai/ (aisa-client, mock, models, pricing, cost, runtime, flags), migration 20261015000001_ai_runtime.sql (ai_usage, ai_budgets), 34 unit tests passing (verified).
- Next: governance PR (action registry, policy, verification) after runtime merges.

## Authz guards (in progress, parallel)
- Builder: active. Scope: lib/authz.ts requireClubRole/requireGlobalAdmin, wired into clubService/postService/gamificationService, INTERNAL_WORKER_SECRET.

## Phase 3.2 — Shared AI runtime (DONE)
- PR: https://github.com/SRogDev/SocialClubs-MVP/pull/11
- Merge SHA: (see above)
- Shipped: lib/ai/ (aisa-client, mock-client, models, pricing, cost, runtime, flags, types), migration 20261015000001_ai_runtime.sql (ai_usage, ai_budgets), .env.example (AISA_*), README touch-up.
- Tests: 34/34 jest tests/unit/ai passing (verified independently).
- Next: governance (action registry, policy, verification) — ADR-002 ready.

## Phase 3.1/14/15/58/59/60 — Governance (in progress)
- Builder: active. Scope: lib/ai/actions.ts (registry), proactivity.ts (matrix), policy.ts, verify.ts (pipeline), agents.ts (3 definitions), migration 20261015000002_ai_governance.sql (club_ai_config, ai_actions, ai_action_reviews).

## Phase 3.2 — Shared AI runtime (DONE, details)
- PR #11 merged @ 4bbf210. 17 files: lib/ai/ (8 files), migration (ai_usage, ai_budgets, RLS), 5 test suites, .env.example, README, STATUS.md.
- Tests: 34/34 jest tests/unit/ai PASS (TDD red→green). tsc clean. eslint 0 errors.
- Pre-existing (unrelated): 2 jest failures on clean tree; `npm run build` fails at page-data collection on missing STRIPE_SECRET_KEY (also on clean tree).

## Authz guards (DONE)
- PR: https://github.com/SRogDev/SocialClubs-MVP/pull/12
- Merge SHA: 8179ae9
- Shipped: lib/authz.ts (requireClubRole, requireGlobalAdmin), guards wired into clubService/postService/gamificationService, INTERNAL_WORKER_SECRET, tests.
- Note: builder's merge API call hit transient 404; merged manually, verified.

## Authz guards (DONE, details)
- PR #12 merged @ 8179ae9. 12 files: lib/authz.ts (requireClubRole, requireGlobalAdmin, requirePostAccess, requireInternalWorker), guards in clubService/postService/gamificationService.
- Tests: 15/15 jest tests/unit/authz PASS. tsc no new errors. Build passes (with dummy env for pre-existing gates).

## Phases 3.1/14/15/58/59/60 — Governance (DONE)
- PR: https://github.com/SRogDev/SocialClubs-MVP/pull/13
- Merge SHA: 839fd6f
- Shipped: lib/ai/actions.ts (registry), proactivity.ts (matrix), policy.ts (deny-by-default), verify.ts (pipeline), agents.ts (3 definitions), migration 20261015000002 (club_ai_config, ai_actions, ai_action_reviews), flags.ts (AI_REVIEWER), types.ts (AI_UNKNOWN_ACTION).
- Tests: 76/76 jest tests/unit/ai PASS (34 runtime + 42 governance).
- Note: builder closed at 42min (stuck in build-poll loop); PR created and merged by coordinator from its verified working copy.

## Phase 19 — Signal/trigger layer (DONE)
- PR: https://github.com/SRogDev/SocialClubs-MVP/pull/14
- Merge SHA: 4003c75
- Shipped: ai_signals table + emitSignal (dedup), QStash worker /api/queues/ai-signals, real emitters in post/club/gamification services.

## Phase 19 — Signal/trigger layer (DONE, details)
- PR #14 merged @ 4003c75. lib/ai/signals.ts (emitSignal + dedup), signal-dispatch.ts, worker /api/queues/ai-signals, migration (ai_signals), real emitters (new_post, member_joined, points_milestone).
- Tests: 20/20 signals, 96/96 full ai suite. tsc clean. Build green.
- Note: v1 drafts are deterministic (no LLM per event, cost discipline); LLM-composed drafts later.

## Phases 4-7/10/16/20/21 — Community Manager v0 (DONE)
- PR: https://github.com/SRogDev/SocialClubs-MVP/pull/15
- Merge SHA: 4676656
- Shipped: lib/ai/agents/community-manager.ts (answerFAQ grounded, draftOnboarding, draftSignalResponse), signal worker routing, app/api/ai/faq, components/ai/AskClub.tsx (Spanish UI), migration 20261015000004 (FAQ shape).
- Tests: 8/8 community-manager PASS.
- Note: builder closed at 37min (poll loop); PR created/merged by coordinator. Fixed missing new-dir files before merge.

## Phases 8/9/17/18/22/23/24 — AI Inbox (DONE)
- PR: https://github.com/SRogDev/SocialClubs-MVP/pull/16
- Merge SHA: ac59703
- Shipped: lib/ai/inbox.ts, /api/ai/inbox routes, panel ai-inbox page (Spanish UI), sidebar badge.
- Tests: 29/29 inbox PASS.
- Note: builder closed at 30min (poll loop); PR created/merged by coordinator. Removed stray deliver_inbox_pr.py before merge.

## Phases 25-28 — Relationship intelligence (DONE)
- PR: https://github.com/SRogDev/SocialClubs-MVP/pull/17
- Merge SHA: e960c0a
- Shipped: member_signals table, lib/ai/relationship.ts (profiles, churn heuristic), signal recording, member profile API.

## Phases 25-28 — Relationship intelligence (DONE, details)
- PR #17 merged @ e960c0a. 9 files.
- Tests: 156/156 tests/unit/ai PASS (16 suites). tsc clean. Build succeeds.
- Note: builder handled mid-flight merges of #15/#16 (deleted duplicate, restored their test).

## Phases 29-33 — Moderation AI (DONE)
- PR: https://github.com/SRogDev/SocialClubs-MVP/pull/18
- Merge SHA: 5fff734
- Shipped: layered moderation (deterministic → AI classifier → risk action), moderation_events table, never auto-hides at L1.

## Fix — moderation verify integration (DONE)
- PR: https://github.com/SRogDev/SocialClubs-MVP/pull/19
- Merge SHA: e13c8ae
- Fixed: violations now route through verifyAndExecute (hide_post) → AI Inbox pending_approval.

## Phases 34-37/39/40 — Creator Copilot (DONE)
- PR: https://github.com/SRogDev/SocialClubs-MVP/pull/20
- Merge SHA: 852532c
- Shipped: lib/ai/creator-copilot.ts (draftPost, suggestTags, improvePost), club-context.ts, /api/ai/copilot routes, CopilotPanel.tsx (Spanish UI).
- Tests: 79/79 tests/unit/ai PASS.

## Phases 41-45 — Community automation (DONE)
- PR: https://github.com/SRogDev/SocialClubs-MVP/pull/21
- Merge SHA: a04366b
- Shipped: lib/ai/workflows.ts (welcome, reengagement, digest), 6 actions with real executors, QStash worker, ai-config panel (Spanish), cron.
- Tests: 219/219 tests/unit/ai PASS (20 suites).
- Note: fixed syntax error in moderation.ts:143 from PR #19 (my fix had `['hide_post'][],`).

## Phases 46-52 — Events v2 + Experience Director (DONE)
- Main: a92957f (PR #22 closed; commit present on main with events files verified)
- Shipped: events/event_rsvps tables, derived phases, event APIs, RSVP, Spanish event pages, experience-director agent.
- Note: PR #22 shows closed-unmerged but the squash commit is on main; files verified present.

## Phases 53-57 — Widget runtime (DONE)
- PR: https://github.com/SRogDev/SocialClubs-MVP/pull/23
- Merge SHA: bf9af85
- Shipped: 5 typed widget types (poll, countdown, leaderboard, faq, rsvp), renderers, suggest API, postSchema zod fix.
- Tests: 259/259 PASS.

## Phases 58-62 — Sentient UI (DONE)
- PR: https://github.com/SRogDev/SocialClubs-MVP/pull/24
- Merge SHA: 4cbfcf5
- Shipped: UI recommendations engine, SmartPanel, ActivityPulse, realtime broadcast.
- Tests: 141/141 tests/unit/ai PASS.

## Phases 63-66 — AI memory (DONE)
- PR: https://github.com/SRogDev/SocialClubs-MVP/pull/25
- Merge SHA: dc050cb
- Shipped: ai_memory/ai_feedback tables, recordFeedback, Inbox wiring, prompt context, memory API.
- Tests: 293/293 PASS.

## Phases 67-68 — AI evals (DONE)
- PR: https://github.com/SRogDev/SocialClubs-MVP/pull/26
- Merge SHA: 7584857
- Shipped: eval harness, 79 evals (FAQ grounding, moderation, jailbreak, budget), input guards, docs/AI-EVALS.md.
- Evals: 79/79 PASS ($0, deterministic mocks).
- Follow-ups: wire screenAgentInput into invokeAgent; deterministic output verifier for answerFAQ.

## Phases 69-72 — Cost observability (DONE)
- PR: https://github.com/SRogDev/SocialClubs-MVP/pull/27
- Merge SHA: 85264d8
- Shipped: cost dashboard lib + API + Spanish UI, budget alerts, screenAgentInput wired into invokeAgent.
- Tests: 307/307 PASS. Evals: 79/79 PASS.

## Phases 73-76 — Security/privacy (DONE)
- PR: https://github.com/SRogDev/SocialClubs-MVP/pull/28
- Merge SHA: 939a105
- Shipped: AI disclosure labels, member opt-out preferences, audit API, AIPreferences UI.
- Tests: 17/17 transparency PASS.
- Note: local worktree diverges from remote; built against remote main.

## Phases 77-80 — Analytics (DONE)
- PR: https://github.com/SRogDev/SocialClubs-MVP/pull/29
- Merge SHA: 90919f9
- Shipped: analytics lib, dashboard, daily briefing cron, trust explanations.
- Tests: 12/12 PASS.

## Demo seed (DONE)
- PR: https://github.com/SRogDev/SocialClubs-MVP/pull/30
- Merge SHA: e1a57d3
- Shipped: is_demo marker, seed-demo.ts, clean-demo.ts, docs/DEMO.md.

## Fix — route slug conflict (DONE)
- PR: https://github.com/SRogDev/SocialClubs-MVP/pull/31
- Merge SHA: f8ddc2f
- Fixed: [id] vs [clubId] conflict blocking dev/prod server.

## Fix — route slug conflicts (DONE)
- PR #31: https://github.com/SRogDev/SocialClubs-MVP/pull/31 (leaderboard [id]→[clubId])
- PR #32: https://github.com/SRogDev/SocialClubs-MVP/pull/32 (club route [id]→[clubId])
- Merge SHAs: f8ddc2f, 8d4d76a
- Fixed pre-existing Next.js route conflict blocking dev/prod server.

## FINAL VERIFICATION (2026-10-16)
- Build: GREEN (73/73 pages, exit 0)
- Tests: 425/427 pass (2 pre-existing failures: cookie-banner, clubStore — verified on clean tree)
- AI tests: 307/307 pass
- Evals: 79/79 pass ($0, deterministic mocks)
- Screenshots: BLOCKED — pages return 500 without Supabase credentials (pending Roger: Supabase project + keys). Demo seed ready via docs/DEMO.md.
