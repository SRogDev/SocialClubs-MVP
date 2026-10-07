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
