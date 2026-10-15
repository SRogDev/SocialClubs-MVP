# SocialClubs

**Your private paid membership club.** SocialClubs lets creators and micro-influencers monetize their community with a private club of their own: paid memberships, exclusive content, video calls, events, and direct connection with their most loyal followers — LatAm-first.

## What it is

If you have an audience, you have a business waiting to happen. SocialClubs gives every creator their own private space where followers become paying members:

- **Paid memberships** — recurring subscriptions via Stripe (one-time plans today, tiers next)
- **Exclusive content** — posts, media, and updates only members can see
- **Video calls & events** — live sessions with your inner circle (Daily + Mux)
- **Community** — channels, comments, polls, leaderboards, gamification
- **Creator dashboard** — earnings, members, and growth metrics

## What it is not

- Not a generic social network — every club is private and paid.
- Not a course platform — it's an ongoing membership relationship.
- No AI-agent gimmicks — the product is the club, not a chatbot.

## Status

- **Public repo.** Under active development toward the first paid launch.
- **Monetization:** Stripe Connect + subscriptions are implemented; end-to-end real-money verification is the next milestone (see `docs/STRIPE_SETUP.md`).
- **Live demo:** coming soon.

## Relationship intelligence (AI staff)

SocialClubs keeps a privacy-first memory of member relationships (`lib/ai/relationship.ts`, master plan Phases 25–28):

- `member_signals` (`supabase/migrations/20261015000005_member_signals.sql`) — append-only log of what a member does in a club: `posted` (with tags/topics when present), `engaged` (likes, superlikes, comments), `interest`, `engagement_drop`, `milestone`, `preference`. Recorded fire-and-forget from `services/postService.ts` (`createPost`, `addComment`, `addPostInteraction`) — signal failures never break user actions.
- `recordSignal()` appends one signal; `recordSignalSafe()` never throws (for use inside user actions).
- `getMemberProfile(clubId, userId)` aggregates signals into a profile: top interest tags, engagement trend (`up`/`flat`/`down`, last 7 days vs previous 7), milestones, last active.
- `detectChurnRisk(clubId, userId)` — heuristic: no activity in 14 days + previously active → `{ atRisk: true }`. New members and members with no recorded activity are never flagged.
- `GET /api/ai/member/[userId]/profile?clubId=…` returns the profile; the requester must hold a club role in that club.
- `lib/ai/agents/community-manager.ts` — `draftOnboarding()` and `draftSignalResponse()` now include the member's club-scoped profile summary (interests first) in the prompt context; profile lookup is best-effort and never blocks a draft (degrades to a generic warm draft when no signals exist).

**Privacy model (non-negotiable):** signals are club-scoped — every row carries `club_id`, they are never shared or joined across clubs, and there is no cross-club profiling. The module aggregates only what members explicitly did; it never infers personal attributes (no age/gender/location guessing). RLS on `member_signals` is service-role only; readers must enforce club membership with `requireClubRole` before returning a profile (the API route does).

**AI moderation — `lib/ai/moderation.ts`** (master plan Phases 29–33): layered content moderation for posts and comments.

- **Layer 1 — deterministic (always on, zero cost):** configurable blocklist (`ModerationPolicy`, future source: `club_ai_config.policies.moderation.blocklist`), link-spam heuristic (URLs > `maxUrls`, default 3), ALL-CAPS ratio (`capsRatioThreshold` 0.7 over ≥20 letters). Returns `{ verdict: 'clean'|'suspicious'|'violation', layer: 'deterministic', reasons }`; blocklist hits are confident violations and skip Layer 2.
- **Layer 2 — AI classifier (only for L1 `suspicious`, only when `AI_MODERATION` is on):** `invokeAgent` with the `moderation` agent definition (zod schema `{ verdict, categories, confidence }`), budget-checked and usage-logged like every other staff agent. It can clear or confirm the L1 suspicion.
- **Action mapping:** `clean → none`, `suspicious → flagged_for_review`, `violation → hide_proposed`. **The AI never auto-hides or auto-deletes content** — a violation only creates a pending draft (a `moderation_events` row with `action_taken = 'hide_proposed'`) that the AI Inbox surfaces for a human decision. There is deliberately no "executed" action at L1.
- **Fail-open to human review:** any classifier failure (flag off, budget exceeded, invalid output, provider down) degrades to `suspicious` + `flagged_for_review` — a likely violation is never silently allowed, and no action is taken on an uncertain verdict. Documented choice, not an accident.
- Every classification is audited to `moderation_events` (`supabase/migrations/20261015000006_moderation.sql`, RLS service-role only, read via `GET /api/ai/moderation/events?clubId=…` — owner/admin/moderator roles).
- Wired fire-and-forget into `services/postService.ts` (`createPost`, `addComment`): moderation failures can never break a user action.

**Creator Copilot — `lib/ai/creator-copilot.ts`** (master plan Phases 34–37, 39–40): the creator's AI assistant. **Drafts only — never auto-publishes.**

- `draftPost(topic, clubId, tone?)` — generates a post draft (`title`, `body`, suggested `tags`) via `invokeAgent` (`creator-copilot` agent, `AI_CREATOR_COPILOT` flag). Grounded in the club's real context: `lib/ai/club-context.ts` loads the club name + recent post topics from Supabase (fail-soft; the prompt states missing context explicitly instead of hallucinating). Tones: `friendly` (default), `professional`, `fun`, `inspiring`.
- `suggestTags(content, clubId)` — deterministic candidates first (`extractTagCandidates`: `#hashtags` + top keyword frequencies, exported and pure), then an AI-assisted refinement pass through the same agent.
- `improvePost(content, clubId)` — rewrites for clarity and engagement, returning `{ improved, changes[] }`; the original is never modified in place.
- Every call goes through `invokeAgent`, so the club's monthly AI budget is enforced *before* the model call (`AI_BUDGET_EXCEEDED` → HTTP 402). Publishing is a separate manual action — the module has no postService import and no write path.
- `POST /api/ai/copilot/draft-post` (`{ clubId, topic, tone? }`) and `POST /api/ai/copilot/improve` (`{ clubId, content }`) — logged-in + club owner/admin via `requireClubRole`, rate-limited (MUTATION).
- `components/ai/CopilotPanel.tsx` — Spanish-first creator panel: topic input + tone selector → "Generar borrador" → draft card with Usar borrador / Mejorar / Descartar; plus a "Mejorar texto" tool showing the improved version and the change list. Mounted in the club page's creator area: a "Copiloto IA" button on `ContentCreationBar` (visible only when `clubId` is set).

## Widget runtime (typed configs only — no codegen)

`lib/ai/widget-configs.ts` + `lib/ai/widgets.ts` + `components/widgets/` (master plan Phases 53–57) — the runtime that lets AI staff publish interactive widgets as posts.

**The v1 rule is absolute: widgets are TYPED CONFIGS, never arbitrary code.** The platform ships exactly five widget types — `poll`, `countdown`, `leaderboard`, `faq`, `rsvp` — each with a zod config schema and one React renderer component. There is no codegen, no `eval`, no runtime type registration: adding a widget type means adding a zod schema + a renderer in a reviewed PR, full stop.

- **Registry** (`WIDGET_TYPES`): per type — zod `configSchema`, renderer component name, Spanish description. `validateWidgetConfig(type, config)` throws on unknown types and schema violations.
- **Creation:** `createWidgetPost(clubId, type, config, userId)` validates the config, then creates a `type: 'widget'` post with `content: { widget, config }` through `postService.createPost` (zod post schema, moderation queue, gamification). AI staff agents reach it via their workflow steps, which run under the workflow verification layer.
- **Feed rendering:** `TypedWidgetPost` (wired into `post-card.tsx` and `post-renderer.tsx` for `post.type === 'widget'`) dispatches to the registered renderer only. Unknown widget types and invalid configs render a Spanish fallback card — never a crash. Configs are re-validated defensively at render time because they come from the database.
- **AI suggestions (drafts only):** `POST /api/ai/widgets/suggest` (`{ clubId, context }`) → `{ type, config, reason }` via `suggestWidget()` (`lib/ai/widget-suggest.ts`, `widgets` agent, `AI_WIDGETS` flag). The drafted config must pass registry validation before it is returned; an invalid draft is a hard `AI_OUTPUT_INVALID` error. Logged-in + owner/admin, rate-limited, budget-enforced before the model call.
- **Renderers** (`components/widgets/`, Spanish-first): `PollWidget` (vote buttons + animated results bar; v1 votes are optimistic and local — no persistence backend for widget poll votes yet), `CountdownWidget` (live ticking días/hrs/min/seg), `LeaderboardWidget` (top members by points via new `GET /api/clubs/[id]/leaderboard`, reusing `getClubLeaderboard`), `FaqWidget` (accordion), `RsvpWidget` (event card; the RSVP button POSTs to `/api/events/[id]/rsvp` and degrades gracefully to an informational state until the events API lands).
- **Legacy coexistence:** the generic template-driven `WidgetPost` (`club_widgets` EAV system from `docs/OPEN_WIDGET_PROTOCOL.md`) is untouched — posts carrying `content.club_widget_id` still render through it; posts carrying `content: { widget, config }` use the typed runtime.

**Pre-existing bug fixed in `schemas/postSchema.ts`:** single-argument `z.record(valueType)` is broken in zod 4.3.5 — its compiled parser throws `Cannot read properties of undefined (reading '_zod')` on any non-empty record (verified in CJS and ESM builds). `content` used that form, so `createPostSchema.parse` crashed on every post with non-empty content; it now uses the working two-arg form `z.record(z.string(), z.any())`. The `postTypeSchema` enum already admitted `poll`/`widget` (the delta audit's one-line fix had landed earlier), verified by test.

## Community automation workflows (AI staff)

`lib/ai/workflows.ts` (master plan Phases 41–45) turns product events into multi-step automations that escalate with club trust. Three workflows:

- **welcome** — on `member_joined`: `send_welcome` (low risk) + `enroll_challenge` (medium).
- **reengagement** — when `detectChurnRisk` flags a member: `send_checkin` (low) + `grant_points` (medium, 10 pts via the `ai_incentive` gamification action).
- **digest** — weekly: `post_digest` (low, deterministic counts — never invented content) + `notify_inactive` (medium).

**The proactivity contract** (no branching on level in the workflow code — the governance pipeline resolves it per step):

| Level | Name | Behavior |
|---|---|---|
| 1 | Advisor (default) | Every step lands as a **draft** in the AI Inbox. Nothing is ever auto-sent — no exceptions. |
| 2 | Operator | Low-risk steps auto-execute; medium steps go to the AI reviewer and wait for human approval on escalate. |
| 3 | Autonomous | Low + medium steps auto-execute after passing the AI reviewer; high/critical always need approval. |

How it works:

- `runWorkflow(name, ctx, deps)` composes step inputs (LLM-composed welcome/check-in text via `invokeAgent`; deterministic digest from measured 7-day counts) and runs every step through `verifyAndExecute` (`lib/ai/verify.ts`) — schema → agent permissions → club policy → proactivity mode → AI review (medium+) → execute → audit to `ai_actions`. A failed step never aborts its siblings.
- The six workflow actions are registered in `lib/ai/actions.ts` with calibrated risk (`send_welcome`/`send_checkin`/`post_digest` = low; `notify_inactive`/`grant_points`/`enroll_challenge` = medium) and **real** executors via the delivery seam (`lib/ai/workflow-delivery.ts`): member notifications, club posts, and incentive points. No stubs.
- **Idempotency:** steps dedupe on `<idempotencyKey>:<action>` in `ai_actions`; `runWorkflow` pre-checks all planned step keys and replays the recorded outcome without side effects (or a wasted LLM call).
- Triggers: `member_joined` signals route to `runWorkflow('welcome')` in `POST /api/queues/ai-signals`; `POST /api/queues/ai-workflows` is the QStash worker for direct workflow jobs; `GET /api/cron/ai-digest` (Vercel Cron, Mondays 09:00, `vercel.json`) enqueues the weekly digest per club and scans members with `detectChurnRisk` → enqueues `reengagement` (one per member per week).
- **Creator control center:** `/clubs/[id]/panel/ai-config` (Spanish-first) — proactivity level selector with plain-language explanations of each level, per-agent toggles, and tone. Writes `club_ai_config` (owner/admin only); L1 is the default for clubs that never opt in.

## Sentient UI (AI staff)

`lib/ai/ui-recommendations.ts` (master plan Phases 58–62) turns the club's structured signals into dashboard UI — not chat. `buildRecommendations()` is a pure, deterministic engine aggregating `ai_signals` + `member_signals` + `ai_drafts` + `events` into `UIRecommendation` objects (`{ id, clubId, userId?, kind: 'suggest_action'|'highlight'|'nudge'|'insight', title, body, action?, priority 1–5, expiresAt }`):

- churn-risk member → nudge ("Escríbele a X, lleva N días sin actividad") — **staff-only**, so plain members never see who went quiet; bounded to 3;
- pending drafts → highlight ("Tienes N borradores en la Bandeja IA");
- recent `member_joined` → welcome `suggest_action`;
- upcoming event → highlight;
- quiet club (no activity in 7 days) → insight.

**Every recommendation explains its reason ("porque X")**. `computePulse()` derives the club pulse (active/steady/quiet) from trailing-24h signal counts — no LLM. `getRecommendations()`/`getPulse()` are the async wrappers with an injected `RecommendationDb` (service-role Supabase adapter included; reads go through `requireClubRole` in the routes).

- **API** — `GET /api/ai/recommendations?clubId=…` and `GET /api/ai/pulse?clubId=…`: logged-in + club role (member or above), rate-limited.
- **UI (Spanish-first)** — `components/ai/SmartPanel.tsx`: top-3 recommendations with kind icons and priority colors, dismissible (dismissals are local-only, stored in `localStorage` — no table), mounted above the club feed alongside AskClub for members. `components/ai/ActivityPulse.tsx`: subtle green/yellow/red dot + label in the club header.
- **Live updates** — `lib/ai/realtime.ts`: `dispatchSignal` calls `notifyClubAiUpdate(clubId)` after persisting a signal, broadcasting on the `club-ai:{clubId}` realtime channel (clients receive broadcast events, never raw rows — the `ai_signals` service-role-only RLS stays intact). Both widgets also poll every 60s as a fallback.

## Stack

Next.js 16.3.6 (App Router) · React 19 · TypeScript · Tailwind · Zod (shared client/server schemas) · React Hook Form · SWR · Supabase (Postgres + Auth + Storage) · Stripe · Daily (video calls) · Mux (video) · Upstash (Redis, rate limiting, QStash queues) · PostHog · Sentry · PWA (service worker, installable)

## Quickstart

```bash
npm install --legacy-peer-deps
npm run dev   # http://localhost:3000
```

1. Create a Supabase project and apply `database.sql` + `supabase/migrations/`.
2. Copy `.env.example` to `.env.local` and fill in the keys (Supabase, Stripe, Daily, Mux, Upstash…).
3. See `docs/STRIPE_SETUP.md` for the payments setup and live-verification checklist.

## Screenshots

_Coming soon — the landing and product tour are being repositioned for creators (Spanish-first, LatAm)._

## Structure

```
socialclubs/
├── app/            # routes (App Router)
├── components/     # feature + shared + ui (shadcn)
├── services/       # business logic, CRUD (presenter pattern)
├── schemas/        # Zod schemas (client + server)
├── hooks/          # React hooks by feature
├── lib/  utils/    # shared code
└── supabase/       # SQL + migrations
```

UI/business-logic separation: components present, `services/` decides. Zod validates on client and server with the same schemas. Optimistic UI on user interactions.

## License

MIT — see [LICENSE](LICENSE).
