# Delta Audit — AI-Staff Readiness (2026-10-15)

Focused verification of `INSPECTION_REPORT.md`, `ESTADO_IMPLEMENTACION.md`, `beforelaunch.md` against the live tree (`main` @ `66a2781`). Read-only; no code changed.

## What the 5-PR catch-up already fixed (docs now stale)
1. **Agent architecture fully deleted** — no `services/agent*.ts`, no `app/api/agent/*`, no `components/agent/`; migration `20261006000001_drop_agent_tables.sql` dropped the 5 tables. Zero hits for `openai|anthropic|@ai-sdk|pinecone|gemini` in `package.json`, `lib/`, `services/`, `app/`.
2. **Gamification worker wired** — 4 live emitters in `app/actions/postActions.ts` (`post_created`, `comment_added`, `like_given`, `superlike_given`) → `enqueueGamificationEvent()` → `POST /api/queues/gamification` → `awardPoints()`.
3. **`club_reports` fixed** — migration `20261006000002_create_club_reports.sql`; consumed by `adminService.getClubsWithReports`.
4. **OSS hygiene** — `package.json` `"private": false`, `LICENSE` at root.
5. **Mocks removed** from explore/admin. All pending GET routes exist.

## Still true (gaps that block AI staff)
6. **No service-level authorization.** Club-role checks live in `proxy.ts` and inline in routes; services (`updateClub`, `banUserFromClub`, gamification) trust their caller. **An AI worker invoking services directly would bypass club roles.** → Build `requireClubRole()` guards inside services before AI acts.
7. **Notification pipeline dormant + no spam controls.** `createNotification` has zero callers; nothing INSERTs into `notifications`. No `notification_preferences` table, no dedup, no throttling. → Ship preferences + dedup before AI sends at volume. (`notifications.metadata jsonb` is the natural carrier for `{ai_generated: true}`.)
8. **No event model.** No `events` table/routes/UI. `vcall_appointments` is 1:1 slots, not reusable for PRE_EVENT→ANTICIPATION→LIVE→POST_EVENT→EXPIRED. → New `events` + `event_rsvps` tables with derived phase from timestamps.
9. **Gamification accounting fragile.** `users_clubs.points` is `smallint` (32,767 cap); award path falls back to non-atomic UPDATE if RPC missing; three point systems unmerged; no `points_history` ledger. → Add ledger before AI-driven awards at scale.
10. **Zero AI guardrails.** No provider, no budgets, no per-club config, no audit table. → Ship `club_ai_config` + `ai_budgets` + `ai_actions` audit before the first AI worker goes live.
11. **Moderation is manual, club-level only.** `club_reports` targets clubs, not posts/comments/users. No auto-moderation, no appeal flow in code.
12. **Post schema mismatch.** `schemas/postSchema.ts:48` rejects `poll`/`widget` types that `types/post.ts` allows — one-line fix when wiring widget posts.
13. **Club levels engine-less.** `clubs.xp` exists but no recalculation service/cron; `club_level_up` notifications never emitted.

## System map (for AI-staff implementation)
- **Posts:** `posts(id, club_id, content jsonb, type text)`. `content` is free-form → can carry typed widget config; nothing does today. Widget runtime exists separately (`widgets` → `club_widgets` → `club_widgets_data`, `docs/OPEN_WIDGET_PROTOCOL.md`); post→widget seam open but unwired.
- **Permissions:** dual model — global `users.role='admin'` in `proxy.ts:55-93`; per-club `users_clubs.role` text, no CHECK constraint, no service-level guards.
- **Realtime:** Supabase broadcast (chat) + postgres_changes (`notifications` INSERT → push webhook → OneSignal). No presence. Broadcast channels are client-named without auth — AI status channels need server-authorized private channels.
- **Background jobs:** QStash ready (`lib/qstash.ts`, 3 retries, HMAC-verified workers). One cron: `/api/cron/check-appointments` every 5 min (pattern reusable for event phase transitions).
- **Rate limiting:** `@upstash/ratelimit` via `lib/rate-limit.ts` in API routes.

## New tables needed (minimal)
| Table | Why | FKs |
|---|---|---|
| `events` | Community events with `starts_at/ends_at timestamptz`, `timezone`, `capacity`, `status`; phase derived | `clubs(id)` |
| `event_rsvps` | Participation signal + capacity | `events(id)`, `users(id)` |
| `ai_actions` | Append-only audit of every AI-staff action; Realtime source for AI status | `clubs(id)`, `users(id)` nullable |
| `ai_action_reviews` | Human/AI approvals for sensitive actions | `ai_actions(id)`, `users(id)` |
| `member_signals` | Engagement/churn/interest signals for personalization | `clubs(id)`, `users(id)` |
| `club_ai_config` | Per-club AI config: agents, tone, proactivity, quiet hours | `clubs(id)` PK |
| `ai_budgets` | Spend caps per club per period | `clubs(id)` |
| `notification_preferences` | Per-user toggles + quiet hours (already in beforelaunch.md) | `users(id)`, `clubs(id)` nullable |
| `points_history` | Immutable points ledger (fixes unauditable smallint) | `users(id)`, `clubs(id)` |
| `content_reports` | Extend club-only reports to post/comment/user targets | `clubs(id)`, `posts(id)` nullable |

## Dead weight to remove (later cleanup)
- `app/clubs/[id]/panel/automatization/page.tsx` still renders mock data — natural home for future AI-staff config UI.
- Root `clubmocks.json` has zero references.
- Old agent migration files in `supabase/migrations/` (harmless history, keep).
