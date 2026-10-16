# SocialClubs — Demo Guide

This is the official walkthrough for demoing SocialClubs to **recruiters,
investors, or Roger's own community**. It uses a clearly-marked demo dataset —
**demo data is marked and never mixes with production.**

## The golden rule

> **All demo data is marked. All demo data is deletable. Nothing demo-looking
> ever ships as production data.**

- Demo clubs carry `clubs.is_demo = TRUE`
  (`supabase/migrations/20261015000011_demo_seed_marker.sql`).
- Demo users are identified by the `@demo.socialclubs` email domain
  (we can't add columns to `auth.users`).
- `npm run clean:demo` removes **all** of it: demo clubs (everything under
  them cascades: posts, polls, events, AI drafts, signals, moderation events)
  plus the demo auth users and their public profiles.
- Both scripts **refuse to run when `NODE_ENV=production`** unless you
  explicitly set `DEMO_ALLOW_PROD=1` (meant for throwaway staging projects).

## Setup

### 1. Prerequisites

- A Supabase project with all migrations applied, including
  `20261015000011_demo_seed_marker.sql` (the `is_demo` column) and
  `20260302000003_seed_base_widgets.sql` (the base `giveaway` widget).
- `.env.local` with:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY` (server-side only — never commit it)

### 2. Seed

```bash
npm run seed:demo
```

Creates:

| Entity | Detail |
|---|---|
| Club | **"Club Demo"** — `is_demo=true`, Spanish bio, public |
| Users | `creador@demo.socialclubs` (owner), `maria@`, `carlos@`, `sofia@demo.socialclubs` (members) |
| Posts | 5 — 3 text posts, 1 poll post ("¿Qué tema prefieren…?"), 1 widget post (giveaway) |
| Event | 1 upcoming, published, "Encuentro en vivo: Preguntas y respuestas", 3 RSVPs |
| AI config | 3 Spanish FAQ entries in `club_ai_config.policies.faq` |
| AI drafts | 2 `pending_approval` rows in `ai_actions` (welcome message + weekly digest) |
| Signals | 6 sample `member_signals` rows (posted / engaged / interest / milestone / preference) |
| Moderation | 1 `flagged_for_review` event |

Default password for all 4 demo accounts: `SocialClubs-Demo-2026!`
(override with `DEMO_USER_PASSWORD`). These are throwaway demo accounts —
documented here on purpose, never use real credentials.

Re-running the seed while demo data exists exits early with a reminder to
clean first (no duplicates).

### 3. Clean

```bash
npm run clean:demo
```

Deletes every demo club (`is_demo=true` → cascade), every `@demo.socialclubs`
auth user, and their public profiles — then verifies nothing demo-marked
remains. Real data is never touched.

## Demo flow (recruiters, ~10 minutes)

Log in as `creador@demo.socialclubs` and follow this script:

### 1. Landing → club (2 min)

- Open the landing page. Point out: creator-owned private clubs, paid
  memberships, LatAm-first positioning.
- Enter **Club Demo**. Narrate: *"This is a seeded demo club — everything
  here is marked `is_demo` and wipes clean with one command."*
- Scroll the feed: welcome post, discussion post, event reminder, **poll
  post** ("¿Qué tema prefieren…?"), **giveaway widget post**. Vote in the
  poll live.

### 2. Ask the FAQ (2 min)

- Open the club assistant / AI chat.
- Ask: **"¿Qué es Club Demo?"** → the Community Manager answers *only* from
  the seeded FAQ (`club_ai_config.policies.faq`) — anti-hallucination by
  design. Try **"¿Cómo me uno a un evento?"** too.
- Ask something NOT in the FAQ → it declines instead of inventing an answer.

### 3. AI Inbox (3 min)

- Open the **AI Inbox** (staff panel). Show the two `pending_approval`
  drafts: the welcome message for Sofía and the weekly digest.
- **Approve** the welcome draft → it executes; **dismiss** or edit the
  digest → show the audit trail (`ai_actions` keeps policy/review/execution
  snapshots).
- Open the moderation queue: the `flagged_for_review` event. Explain:
  *"The AI never auto-hides — a human approves every consequential action."*

### 4. Analytics (2 min)

- Open club analytics: member signals feed the relationship profiles
  (`member_signals` → per-member interests, engagement trend, churn risk).
- Show the event with 3 RSVPs and post stats (likes/views seeded so charts
  aren't empty).
- Close with the differentiator: *"AI staff with a governance pipeline —
  drafts, approvals, budgets, audit — not a chatbot bolted on."*

### 5. Clean up (30 sec, optional live)

- Run `npm run clean:demo` and show the verification output:
  *"Demo data fully removed. No production data was touched."*

## Screenshots checklist

Capture these for decks / the repo / social posts:

- [ ] Landing hero
- [ ] Club Demo feed (5 posts visible)
- [ ] Poll post with options + a cast vote
- [ ] Giveaway widget post
- [ ] Event page with RSVPs
- [ ] AI chat answering a FAQ question (Spanish)
- [ ] AI Inbox with the 2 pending drafts
- [ ] Approving a draft → executed state
- [ ] Moderation queue (`flagged_for_review`)
- [ ] Analytics / member profile screen

## Troubleshooting

| Problem | Fix |
|---|---|
| `is_demo column does not exist` | Apply migration `20261015000011_demo_seed_marker.sql` |
| `base widget "giveaway" not found` | Apply migration `20260302000003_seed_base_widgets.sql` |
| Seed says "already seeded" | Run `npm run clean:demo` first, then reseed |
| `REFUSING to seed/clean` | You're in `NODE_ENV=production` — this is the guard working. Use a dev/staging project, or set `DEMO_ALLOW_PROD=1` deliberately |
| Auth user already exists | The seed reuses existing `@demo.socialclubs` users by email — safe to continue |

## Files

- `scripts/seed-demo.ts` — creates the demo dataset (service-role key)
- `scripts/clean-demo.ts` — removes the demo dataset completely
- `supabase/migrations/20261015000011_demo_seed_marker.sql` — `clubs.is_demo`
- `package.json` — `seed:demo` / `clean:demo` scripts
