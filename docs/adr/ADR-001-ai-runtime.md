# ADR-001: Shared AI Runtime for SocialClubs AI Staff

**Status:** accepted (2026-10-15)
**Context:** Master plan Phases 3, 38, 63, 69–71. Roger mandated AIsa (api.aisa.one) as the sole LLM provider, unchanged pricing (AI cost must fit inside platform margin), no duplicated audit work.

## Decisions

### 1. Provider: AIsa, OpenAI-compatible
- All LLM calls go through `lib/ai/aisa-client.ts` → `POST https://api.aisa.one/v1/chat/completions`.
- Auth: `AISA_API_KEY` env. **No key → deterministic mock adapter** (`lib/ai/mock-client.ts`) so dev/test/CI work offline. Mock returns fixed, schema-valid responses tagged `mock: true`.
- Never commit keys. `.env.example` documents `AISA_API_KEY`, `AISA_MODEL_FAST`, `AISA_MODEL_SMART`, `AISA_MODEL_REVIEWER`.

### 2. Model routing (plan Phase 70)
- `fast` (classification, FAQ retrieval): cheap model.
- `smart` (composition, reasoning): stronger model.
- `reviewer` (verification): strong model, can equal `smart`.
- Model IDs are env-configurable; defaults chosen at implementation time from AIsa's model list. No provider-specific code outside `aisa-client.ts`.

### 3. Cost control inside platform margin (plan Phases 38, 71)
- Every LLM call logs tokens + estimated cost to `ai_usage` (per club, agent, workflow, model).
- `ai_budgets`: per-club monthly cap (default from env `AI_MONTHLY_BUDGET_USD_DEFAULT`, e.g. $5). When cap hit → AI features degrade gracefully for that club (no crash, clear UI state).
- Runtime enforces: per-call timeout, retries with backoff (max 2), concurrency limit per club, dedup/idempotency keys on actions.
- No per-member AI upsell (pricing unchanged per Roger). Budgets sized so a normal club never hits the cap; caps protect against viral spikes.

### 4. Runtime shape (`lib/ai/`)
- `types.ts` — `AgentDefinition`, `AISignal`, `AIAction`, `VerificationResult`, `CostRecord`.
- `runtime.ts` — `invokeAgent(def, ctx)`: assembles context (authorization-aware), calls model, validates structured output, logs usage, traces latency. Agents never call the HTTP client directly.
- Deterministic validation (permissions, schemas, ids, rate limits) is plain code, never an LLM call (plan 15.1).

### 5. Feature flags (plan Phase 63)
- Env-based flags in `lib/ai/flags.ts`: `AI_STAFF_ENABLED` (master), `AI_COMMUNITY_MANAGER`, `AI_EXPERIENCE_DIRECTOR`, `AI_CREATOR_COPILOT`, `AI_INBOX`, `AI_MODERATION`, `AI_SENTIENT_UI`, `AI_WIDGETS`. All default OFF. UI surfaces check flags before rendering.

### 6. What this ADR does NOT decide
- Exact model IDs (resolved at implementation against AIsa's live list).
- Per-token prices (logged as tokens; USD estimated from a static price table in `lib/ai/pricing.ts`, updated manually).

## Consequences
- All future AI work builds on `invokeAgent` — no ad-hoc fetch calls to AIsa.
- Tests use the mock adapter; no key needed in CI.
- If AIsa is unreachable at runtime, calls fail closed with explicit `AISA_UNREACHABLE` errors (never silent).
