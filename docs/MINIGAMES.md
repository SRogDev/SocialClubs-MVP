# Minigame Runtime (Workstream B — plan Phase 9, redefined by Roger 2026-10-23)

Creators invent minigames **by prompt** ("a golpe de prompt"); members play
them inside clubs and club events. The key feature — *"la gracia"* — is
that games connect to **all aspects of the club** through a typed,
permissioned bridge: member identity, club points, leaderboards, game
state, event context, temporary unlocks and experience outcomes. Games
never touch the database, the network, or secrets.

Roger's model: **free code generation** (the AI may generate ANY game) +
**mandatory MINI constraints** + **sandbox-only execution** +
**server-side enforcement** ("games propose, server disposes").

## Creation flow

```
creator prompt
  → STEP 1 · structured GameBrief (lib/games/brief.ts)
      gameType, mechanics, players, scoringIntent, maxScore,
      pointsPerSession, sessionMinutes, declared capabilities,
      optional contentSource (+ later: profile, externalActions)
  → content fetch (only when brief declares BOTH a contentSource and
      the content.read capability — generation-time, read-only:
      "content-born games", e.g. a quiz from the creator's latest post)
  → STEP 2 · free code generation FROM THE BRIEF (one self-contained
      HTML file) — lib/games/generate.ts
  → static validation (lib/games/validate.ts); on failure ONE repair
      retry with the violations fed back; failures are reported,
      never hidden
  → DRAFT in the club game library (panel/ai-games studio)
  → creator reviews: sandboxed preview (preview sessions simulate
      effects, nothing persists) → Approve / Edit (re-prompt) / Reject
  → published games attach to events or posts and are playable
```

Both AI steps run through the existing AIsa runtime (`invokeAgent`):
club AI budget enforced before each call, prompt-injection screening,
usage logged — generation draws from the club AI budget. **Offline**
(no `AISA_API_KEY`): a deterministic keyword brief + the platform
sample game (a real playable reaction game) keep dev/demo working at
$0, labeled `mock: true` — never presented as AI output.

The **Experience Director** authors games too (creators + the club AI
create; members only play): `suggestGameForEvent` (lib/games/director.ts)
runs the same pipeline and stores a **draft** attached to the event —
it never auto-publishes. Published library games are selectable
experience primitives (`listLibrary(clubId, 'published')` +
`attachGame`).

## MINI constraints (lib/games/constraints.ts — enforced 3 times)

The brief schema clamps to them, the static validator enforces them,
and the server enforces them again at runtime (defense in depth).

| Rule | Value |
|---|---|
| Single self-contained HTML file | ≤ **65,536 bytes** (64 KiB) |
| Session length | ≤ **10 minutes** (brief picks 1–10; server expires sessions) |
| Score cap | ≤ **100,000** (brief picks its own ≤ this) |
| Points per member per session | ≤ **50** total, ≤ **3** award calls |
| Score submissions per session | ≤ **20** |
| Persistent state | ≤ **8,192 bytes/key**, ≤ **20 keys**, optional expiry |
| Leaderboard size | ≤ **25** entries |
| Bridge rate limit | **60 calls / session / minute** |
| Generation attempts | **2** (initial + one repair) |
| Network | **none** — CSP `connect-src 'none'` + static bans |
| Storage / cookies / eval / dynamic import / Wasm | **forbidden** (static bans) |
| Communication | **ClubGame bridge only** (raw postMessage forbidden) |
| Multiplayer | **asynchronous only** in v1 (leaderboards over time/event windows) |

## Sandbox (plan Phase 30)

Games **never execute in the primary app**. Play = a sandboxed iframe
(`sandbox="allow-scripts"`, NO `allow-same-origin`) whose document is
composed by `composePlayableHtml` (lib/games/bridge.ts): the validated
artifact + platform CSP (`default-src 'none'`, `connect-src 'none'`,
`form-action 'none'` — network is impossible at runtime, not just by
static check) + the trusted `ClubGame` SDK injected by the platform
(not part of the validated artifact). Host ↔ game communication is
exclusively the versioned postMessage protocol `SC_GAME_BRIDGE` v1;
the host accepts messages only from its own iframe's `contentWindow`,
and the playable document is served **only bound to a server-issued
session** (`POST /api/games/[id]/session`).

Sandbox-provider abstraction: the iframe is today's provider; a Vercel
Sandbox provider could host server-side game logic later behind the
same protocol.

## The Club Bridge (capabilities)

Declared in the brief, approved by the creator at publish, enforced
server-side per call (`lib/games/service.ts`). Undeclared capability →
`CAPABILITY_NOT_DECLARED`. Every call is authenticated (session binds
game + club + member + event), rate-limited, and audited
(`game_bridge_audit`).

| SDK | Capability | Server semantics |
|---|---|---|
| `ClubGame.member()` | `member.profile` | Current member context (id, name, avatar, role, points) — read-only, session member only |
| `ClubGame.awardPoints(amount, reason, key)` | `points.award` | Validated request: amount ≤ brief cap, session totals enforced, **idempotency ledger first** (unique key; retries return `duplicate`, never double-award). The grant runs through the existing gamification `ai_incentive` action, whose **club-configured value** governs the actual credit (anti-inflation) |
| `ClubGame.submitScore(score, key)` / `ClubGame.leaderboard(scope)` | `leaderboard` | Score ≤ brief maxScore; idempotent per key; best-per-member boards, club- or event-scoped |
| `ClubGame.getState(key, scope)` / `setState(key, value, opts)` | `game.state` | Scoped game+club(+member); member scope always uses the SESSION's user (anti-spoof); size/key caps + TTL |
| `ClubGame.event()` | `event.context` | Event context + lifecycle phase when the session is event-bound |
| `ClubGame.unlock(grant, ttlMinutes)` | `unlocks` | Temporary grants with expiry (ephemeral pattern) |
| `ClubGame.outcome(type, payload)` | `outcomes` | Phase 23 outcome types; persisted (`game_outcomes`) and mirrored into community intelligence as `engaged` signals (source: 'game') |
| `ClubGame.app(actionId, args)` | `apps.invoke` | Connected apps — Workstream C (`docs/INTEGRATIONS.md`) |

## Anti-cheat — honest model

Free code cannot be recomputed server-side, so v1 anti-cheat is
**bounds, not proofs**: server-issued sessions + expiry, per-brief
score/points caps, per-session call caps, rate limits, idempotency
ledgers, and club-configured point values. A tampered client can claim
at most the brief's capped score/points for its own member — it cannot
touch other members, other clubs, or exceed caps. Anything stronger
(server-replayed logic) requires interpreted games, which Roger
explicitly rejected in favor of free code.

## Data model (migration 20261023000001)

`games` (library: brief, html, capabilities, status, validation, mock),
`game_sessions`, `game_scores` (unique idempotency key),
`game_states`, `game_unlocks`, `game_outcomes`, `game_point_awards`
(unique idempotency key), `game_bridge_audit`. All RLS-on,
service-role only; all access flows through `lib/games/service.ts`
behind the authenticated routes in `app/api/games/`.

## Feature flag

`AI_MINIGAME_RUNTIME` (plan Phase 63's `minigame_runtime`), default
OFF, like every AI subsystem. Generation additionally flows through
the AI staff master flag via the runtime.

## Tests

`tests/unit/games/` — validator (30, incl. 19 adversarial snippets),
bridge protocol/CSP (6), generation pipeline (brief→code→repair,
content-born, offline sample), service (49: caps, idempotency,
cross-member/game state isolation, expiry, rate limits, preview
simulation), end-to-end (prompt → publish → play → leaderboard +
single points grant + outcomes; Experience Director draft).
