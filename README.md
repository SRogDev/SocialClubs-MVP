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
- No AI-agent gimmicks — the product is the club, not a chatbot. (An AI *staff* operations layer is now being built per the approved master plan: invisible ops help for creators, verification before autonomy — see `docs/delta-audit/AI-STAFF-READINESS.md`.)

## Status

- **Public repo.** Under active development toward the first paid launch.
- **Monetization:** Stripe Connect + subscriptions are implemented; end-to-end real-money verification is the next milestone (see `docs/STRIPE_SETUP.md`).
- **AI Staff:** the shared AI runtime (`lib/ai/`) is in progress — see below.
- **Live demo:** coming soon.

## AI Staff (in progress)

SocialClubs is growing an AI staff layer (Community Manager, Experience Director, Creator Copilot — master plan Phase 3+), built **with verification before autonomy**. This is not the deleted chatbot-agent architecture: agents never act directly, every action is structured, validated, and auditable.

**Shared runtime — `lib/ai/`** (design: `docs/adr/ADR-001-ai-runtime.md`):

- `runtime.ts` — `invokeAgent(def, signal)`: the only sanctioned entry point. Checks feature flags → enforces the club's monthly budget *before* calling the model → assembles the system prompt from the agent definition → calls the model → validates JSON output against the agent's zod schema → logs usage → returns `{ output, trace }`. All failures are typed errors (`AISA_*`, `AI_BUDGET_EXCEEDED`, `AI_FLAG_DISABLED`, `AI_OUTPUT_INVALID`) — never silent.
- `aisa-client.ts` — AIsa provider client (OpenAI-compatible `POST https://api.aisa.one/v1/chat/completions`, bearer auth, `response_format: json_object`, 30s timeout, 2 retries with exponential backoff). Throws `AISA_NO_KEY` when no key is set — it never mocks.
- `mock-client.ts` — deterministic mock implementing the same interface: schema-valid canned JSON (field names echoed as placeholders), zero tokens, `mock: true`. Used automatically when `AISA_API_KEY` is absent, so dev/test/CI run offline.
- `models.ts` — tier (`fast`/`smart`/`reviewer`) → model id routing, env-overridable (`AISA_MODEL_FAST`, …). Defaults are documented but **must be verified against AIsa's live model list**.
- `pricing.ts` — static per-1K-token price estimates (update manually; never fetched at runtime).
- `cost.ts` — `logUsage()` persists to `ai_usage`; `checkBudget()` reads `ai_budgets` and throws `AI_BUDGET_EXCEEDED` at the monthly cap. Budgets auto-create on first use (default cap from `AI_MONTHLY_BUDGET_USD_DEFAULT`, $5). Migration: `supabase/migrations/20261015000001_ai_runtime.sql`.
- `flags.ts` — env-based feature flags, all default OFF: `AI_STAFF_ENABLED` (master kill switch) plus `AI_COMMUNITY_MANAGER`, `AI_EXPERIENCE_DIRECTOR`, `AI_CREATOR_COPILOT`, `AI_INBOX`, `AI_MODERATION`, `AI_SENTIENT_UI`, `AI_WIDGETS`. An agent runs only when the master flag **and** its own flag are on.

**Cost discipline:** every LLM call logs tokens + estimated cost per club; per-club monthly caps keep AI spend inside the platform margin (no per-member AI upsell — pricing unchanged). Copy `.env.example` to `.env.local` for the `AISA_*` and `AI_*` variables.

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
│   └── ai/         # AI staff runtime (AIsa client, mock, budgets, flags)
└── supabase/       # SQL + migrations
```

UI/business-logic separation: components present, `services/` decides. Zod validates on client and server with the same schemas. Optimistic UI on user interactions.

Service-level authorization: `lib/authz.ts` guards (`requireClubRole`, `requireGlobalAdmin`, `requireInternalWorker`) run inside `services/`, so routes, server actions, and AI workers are all authorized the same way.

## License

MIT — see [LICENSE](LICENSE).
