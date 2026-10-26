# External Integrations — Composio / MCP (Workstream C)

How SocialClubs clubs connect to the creator's own apps (YouTube, TikTok,
Instagram, X, Twitch, Spotify, Discord…) so the AI staff, custom widgets
and minigames can act on them — through the platform's governance, never
around it.

Decisions (Roger, 2026-10-23): provider = **Composio**; the architecture
must allow **any app** (no hard-coded closed list); the launch **starter
surfacing is social + entertainment only** (clubs belong to influencers,
not businesses); connected-app actions are called **through the club
bridge** by games/widgets (declared + creator-approved); **reads are
default-allowed once declared, writes go through AI Inbox approval**
unless inside a creator-approved workflow; creators only OAuth-connect —
**platform-managed, nobody handles API keys**.

## Composio model — verified against official docs (2026-10-23)

- API: REST v3 at `https://backend.composio.dev/api/v3`, header
  `x-api-key: <COMPOSIO_API_KEY>` (one project key, server-side only).
- **Toolkits** = apps (`youtube`, `tiktok`, `instagram`, `twitter`,
  `twitch`, `spotify`, `discord`, …1,000+). Catalog: `GET /toolkits`.
- **Tools** = actions with slugs like `YOUTUBE_GET_CHANNEL_STATISTICS`:
  `GET /tools?toolkit_slug=<slug>`.
- **Auth configs** (`ac_…`) define how a toolkit authenticates. With
  `use_composio_managed_auth`, Composio's own OAuth apps are used, so
  creators never register developer apps or see secrets.
- **Connected accounts** (`ca_…`) bind an end-user (`user_id`, our
  "entity") to a toolkit after OAuth. `POST /connected_accounts/link`
  `{user_id, auth_config_id, callback_url}` returns a hosted
  `redirect_url` (Connect Link, expires in ~10 minutes). Statuses:
  INITIALIZING → INITIATED → ACTIVE (INACTIVE/REVOKED possible).
  Composio stores and refreshes tokens; responses redact credentials —
  **this codebase never receives OAuth tokens**.
- **Execution**: `POST /tools/execute/{TOOL_SLUG}` with
  `{user_id, arguments, connected_account_id?}` →
  `{successful, data, error}`. Credentials are injected by Composio.
- **MCP**: Composio also offers Tool Router sessions (a per-user MCP URL
  + headers) and per-config MCP servers. We deliberately start with the
  REST execution path; the provider port below is MCP-shaped, so a
  session/MCP transport (or a different provider entirely) can be added
  behind the same interface without touching callers.
- Starter-set verification: toolkit pages/docs confirm youtube, tiktok,
  instagram, twitter and discord; spotify and twitch are in Composio's
  public catalog and are filtered at runtime against the live catalog
  response, so an unavailable toolkit simply does not render.

## Architecture

```
creator ──OAuth (hosted link)──▶ Composio (tokens live there)
                                      ▲
club surfaces                         │ execute (project key)
  ├─ AI staff ── Action Registry ──┐  │
  ├─ games ── ClubGame.app() ──────┼─▶│ guarded executor
  └─ widgets ─ ClubGame.app() ─────┘  │   (lib/integrations/executor.ts)
                                      │
        club binding (club_external_connections) decides WHICH
        connection a club may use — the isolation boundary.
```

- **Provider port** — `lib/integrations/types.ts`: `ExternalToolProvider`
  (listToolkits / listTools / listConnections / createConnectLink /
  deleteConnection / executeTool), MCP-shaped. Composio adapter:
  `lib/integrations/composio.ts` (plain fetch, no SDK dependency).
  `composioFromEnv()` returns `null` without `COMPOSIO_API_KEY` — the
  whole surface hides (graceful absence). Tests use
  `lib/integrations/fake.ts`.
- **Tenancy** — the provider entity is the CREATOR:
  `entityIdForUser(uid) = 'sc-user-<uid>'`. Club scoping is ours:
  `club_external_connections` rows bind (club, creator, toolkit,
  connected_account_id). The executor resolves accounts ONLY through
  the calling club's binding — club A can never execute through club
  B's connections (pinned by tests).
- **Action Registry (Phase 58)** — every provider tool registers as an
  `ActionDef` named `ext.<toolkit>.<TOOL_SLUG>`
  (`lib/integrations/registry.ts`) with risk mapped from a conservative
  verb heuristic (`classifyToolRisk`: reads = low, writes = medium,
  destructive = high), permissions `external:<toolkit>`, and audit on.
  No side channels: registry executors delegate to the same guarded
  executor (`configureExternalActionExecutor`, wired in
  `lib/integrations/server.ts`).
- **Guarded executor** — single runtime path (`executor.ts`):
  binding check → per-club+toolkit rate limit (30/min, configurable via
  `INTEGRATION_POLICY`) → risk gate: reads execute; writes (and always
  destructive actions) are converted into **AI Inbox approval requests**
  (a `pending_approval` `ai_actions` row via `supabaseVerifyDb`) and
  NOTHING executes — unless the call runs inside a creator-approved
  workflow (`approvedWorkflowId`) or is re-invoked after approval
  (`inboxApproved: true`). Every attempt is audited.
- **Bridge binding (the differentiator)** — games/widgets declare
  `apps.invoke` + the exact `externalActions` list in their brief; the
  creator approves that list at publish. At runtime
  `ClubGame.app(actionId, args)` → bridge `app` method → game service
  checks the declaration (`ACTION_NOT_DECLARED`) → executor. Reads
  return `{status:'executed', data}`; writes return
  `{status:'pending_approval', inboxItemId}` to the artifact (it shows
  a friendly pending state; artifacts never block on a human).
- **Custom widgets (C1)** — one sandbox runtime, two profiles:
  `brief.profile: 'game' | 'widget'`. Widget artifacts render through
  per-mount `widget` sessions (authenticated, club-bound, rate-limited,
  no play-session expiry) and can never award points or submit scores.
  The typed 5-widget registry stays as the native in-feed layer;
  prompt-generated widgets live in the same club library as games.
- **Creator UI** — `panel/ai-integrations`: starter catalog with
  connect/disconnect (`GET /api/integrations/catalog`,
  `POST|DELETE /api/integrations/connect`). API accepts any toolkit
  slug — only the surfacing is curated (`lib/integrations/catalog.ts`).

## Honest seams / next steps

- **Approval execution**: approving an external write in the AI Inbox
  currently records the decision on the `ai_actions` row; re-executing
  it through the verification pipeline requires merging the dynamically
  discovered external `ActionDef`s into the pipeline's registry view
  (the executor's `inboxApproved` path is ready for that wiring).
- **MCP transport**: Composio Tool Router sessions are the documented
  alternative transport; not needed while REST execution covers the
  tool surface.
- **Live verification** requires Roger's `COMPOSIO_API_KEY` (everything
  here is tested against the fake provider + recorded wire shapes).
- **Panel navigation**: the `ai-integrations` page ships without a
  sidebar link in this branch to avoid colliding with the minigame
  studio's nav edit on the Workstream B branch; add both links together
  when the branches merge.
