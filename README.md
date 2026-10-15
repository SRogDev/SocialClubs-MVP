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
