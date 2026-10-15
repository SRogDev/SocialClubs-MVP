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
- `flags.ts` — env-based feature flags, all default OFF: `AI_STAFF_ENABLED` (master kill switch) plus `AI_COMMUNITY_MANAGER`, `AI_EXPERIENCE_DIRECTOR`, `AI_CREATOR_COPILOT`, `AI_INBOX`, `AI_MODERATION`, `AI_SENTIENT_UI`, `AI_WIDGETS`, `AI_REVIEWER`. An agent runs only when the master flag **and** its own flag are on.

**AI governance — `lib/ai/`** (design: `docs/adr/ADR-002-ai-governance.md`; verification ships *before* autonomy):

- `actions.ts` — `ACTION_REGISTRY`: the 10 v1 actions (`send_message`, `create_post`, `comment_post`, `tag_post`, `hide_post`, `notify_creator`, `create_event`, `grant_temporary_access`, `escalate_to_human`, `pause_agent`). Each declares risk level, required permissions, zod input/output schemas, idempotency and audit flags. Adding a capability = adding an `ActionDef` + policy row + tests — no ad-hoc agent powers. v1 executors are honest stubs (validate + log) except `escalate_to_human` and `notify_creator`, which genuinely persist to `ai_actions`.
- `proactivity.ts` — permission matrix: per-club proactivity level (1=Advisor → drafts only; 2=Operator → auto low-risk; 3=Autonomous → auto low+medium) × action risk → `draft`|`auto`|`approval`. High/critical always need approval.
- `policy.ts` — `evaluatePolicy({ clubId, agentId, action })`: loads `club_ai_config` (defaults to L1 when missing), denies unknown actions/agents by default, resolves the mode.
- `verify.ts` — `verifyAndExecute()`: schema → permission → policy → (medium+: AI reviewer, reviewer tier, max 1 revise loop) → (high/critical or approval mode: pending row for the AI Inbox) → execute → audit. `idempotency_key` is unique: a duplicate key returns the original result without re-executing.
- `agents.ts` — the three staff `AgentDefinition`s (all start at proactivity L1, tools restricted to mission) plus the tool-less `reviewer` definition. Migration: `supabase/migrations/20261015000002_ai_governance.sql` (`club_ai_config`, `ai_actions`, `ai_action_reviews`).

**AI signal/trigger layer — `lib/ai/signals.ts`** (master plan Phase 19): durable, deduplicated event rows (`ai_signals` table, migration `supabase/migrations/20261015000003_ai_signals.sql`) connecting product events to the staff. `emitSignal()` persists with 24h `dedup_key` dedup; `dispatchSignal()` (`lib/ai/signal-dispatch.ts`) persists then fire-and-forget POSTs `{ signalId }` to the QStash worker `POST /api/queues/ai-signals` (HMAC + `INTERNAL_WORKER_SECRET`, same pattern as the gamification worker). The worker loads the row, looks it up in `SIGNAL_ROUTING`, and runs the agent's chosen action through `verifyAndExecute` — at proactivity L1 every action lands as a DRAFT for the AI Inbox, never auto-sent. v1 signals (all → community-manager `send_message` draft): `new_post` (emitted by `createPost`), `member_joined` (emitted by `joinClub`), `points_milestone` (emitted by `awardPoints` on upward crossing of 100/500/1000). Emitters are fire-and-forget: a signal failure is logged and can never break the user-facing action. Draft inputs are composed deterministically in v1 (no LLM call per event — cost discipline); agent-composed drafts are a later phase.

**AI Inbox — `lib/ai/inbox.ts`** (master plan Phases 8, 9, 17, 18, 22, 23, 24): the creator's trust center for the AI staff. Reads the audit trail (`ai_actions` + `ai_action_reviews`) — no separate store. `getPendingActions()` lists drafts awaiting a human; `approveAction()` records a human `approved` review, then **executes the action now** through its registry executor and marks it `executed` (idempotent — a second approve never re-executes); `rejectAction()` records the human `rejected` review with optional feedback and marks the row `rejected` — rejecting never executes. Served by `GET /api/ai/inbox` (owner/admin/moderator; `?status=`, `?humanDecision=`, `?countOnly=1` for the badge) and `POST /api/ai/inbox/[actionId]` (owner/admin only), surfaced at `/clubs/[id]/panel/ai-inbox` ("Bandeja IA", Spanish-first) with tabs Pendientes/Aprobadas/Rechazadas/Ejecutadas, optimistic approve/reject, and a per-card audit trail (proposer, policy summary, reviews). The panel sidebar shows a pending-count badge. Client-safe Spanish labels live in `lib/ai/inbox-display.ts`. Gated by the `AI_INBOX` env flag (default OFF).

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

## License

MIT — see [LICENSE](LICENSE).
