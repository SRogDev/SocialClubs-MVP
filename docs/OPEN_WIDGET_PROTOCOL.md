# Open Widget Protocol (OWP)

> Version 0.1 — SocialClubs Platform

---

## What is a Widget?

A **Widget** is an interactive, self-contained piece of content that club members can publish in any channel. Unlike posts (text, image, video), widgets have a **data model** and **live interaction** — members can join a giveaway, watch a countdown tick, or ask anonymous questions, all inside the feed.

Widgets are the building blocks of a programmable social layer. Any developer — or any user with the Widget Wizard — can create one.

---

## Architecture

The platform implements an **EAV (Entity-Attribute-Value)** pattern with three core tables:

```
widgets               — catalog of widget types (templates stored in schema jsonb)
  └── club_widgets    — one instance per club per published widget
        └── club_widgets_data  — key-value pairs: the actual data of that instance
```

### widgets table

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `name` | text | Slug identifier (`giveaway`, `countdown`, `question-box`) |
| `schema` | jsonb | **Contains the full widget template** (see below) |
| `status` | text | `active` \| `pending_review` \| `rejected` |
| `creator_user_id` | uuid | `NULL` for platform widgets, user id for community widgets |
| `version` | text | Semver string (`1.0.0`) |
| `icon_svg` | text | Raw SVG string for the widget icon |

### schema jsonb structure

Every widget's behavior is described entirely by its `schema` column. There are no per-widget components in the codebase — just two generic renderers (`WidgetModal`, `WidgetPost`) that interpret these templates.

```jsonc
{
  "slug": "giveaway",
  "pinned": false,               // true → post is pinned in the channel (e.g. countdown)

  // Drives the creation form (WidgetModal)
  "modal_template": {
    "fields": [
      {
        "id": "title",
        "label": "Giveaway Title",
        "type": "text",          // text | textarea | datetime-local | number | url | select
        "placeholder": "e.g. Win a free premium month!",
        "required": true,
        "validation": { "minLength": 3, "maxLength": 100 }
      }
    ],
    "submit_label": "Launch Giveaway"
  },

  // Drives the published post view (WidgetPost)
  "post_template": {
    "sections": [
      { "type": "header",        "config": { "icon": "Gift", "title_from": "data.title" } },
      { "type": "text-block",    "config": { "label": "Prize", "value_from": "data.prize" } },
      { "type": "date-display",  "config": { "label": "Draw date", "value_from": "data.resolve_at", "format": "full" } },
      { "type": "stat-row",      "config": { "stats": [{ "label": "joined", "value_from": "cache.participant_count", "default": 0 }] } },
      { "type": "action-button", "config": { "action": "join", "label": "Join Giveaway", "leave_label": "Leave Giveaway", "user_check": { "array_from": "data.participants", "user_id_field": "user_id" } } }
    ]
  },

  // Conceptual data model — shown in Widget Wizard UI to help users understand what data their widget stores
  "data_schema": {
    "title":        { "type": "string",   "description": "Giveaway title" },
    "prize":        { "type": "string",   "description": "Prize description" },
    "resolve_at":   { "type": "datetime", "description": "When the winner is picked" },
    "participants": { "type": "array",    "description": "Users who joined", "items": { "user_id": "string", "joined_at": "datetime" } }
  }
}
```

### Section types (post_template)

| Type | Description |
|------|-------------|
| `header` | Icon + title bar |
| `text-block` | Labeled text value from data |
| `date-display` | Formatted date (`full`, `short`, `relative`) |
| `stat-row` | Row of numeric stats (from `data.*` or `cache.*`) |
| `countdown-display` | Live ticking countdown to a datetime |
| `action-button` | Join/leave toggle linked to an interaction action |
| `text-input-action` | Anonymous text input → dispatches an interaction |
| `qa-list` | List of questions with creator answer support |

Data paths use a `source.key` notation:
- `data.title` → resolves from `club_widgets_data` (key = `title`)
- `cache.participant_count` → resolves from `club_widgets.cache_data`

---

## External API Integrations (Foundation)

Some widgets will need to call external services — a Google Calendar widget, a Notion database viewer, a GitHub PR tracker. The platform provides two tables to support OAuth-based service connections without users ever handling API keys.

### widget_api_integrations

Declares which external service a widget needs and how to perform the OAuth flow.

```sql
widget_api_integrations (
  widget_id,
  service_name,     -- 'notion', 'google-calendar', 'airtable'
  display_name,     -- human-readable: 'Notion', 'Google Calendar'
  oauth_config,     -- { auth_url, token_url, client_id_env_var, client_secret_env_var }
  required_scopes   -- ['read_database', 'read_blocks']
)
```

### user_service_connections

Stores per-user OAuth tokens (AES-256-GCM encrypted at the application layer before insertion).

```sql
user_service_connections (
  user_id,
  service_name,
  access_token,       -- encrypted
  refresh_token,      -- encrypted
  token_expires_at,
  scope,
  metadata            -- e.g. { workspace_id: '...', workspace_name: 'My Team' }
)
```

**Flow (not yet implemented):**
1. User picks a widget that requires Notion
2. Platform detects the `widget_api_integrations` row
3. If `user_service_connections` row exists for `(user_id, 'notion')` → proceed
4. Otherwise → redirect to OAuth flow → store encrypted token → proceed
5. Widget server action uses the stored token to call the external API

---

## Widget Wizard

The Widget Wizard is the AI-assisted creation tool inside the Agent Panel. It allows any club creator to build and publish their own widgets without writing code directly in an IDE.

### User Interface

The Wizard consists of three panels rendered side by side:

```
┌────────────────┬──────────────────────────────┬──────────────────┐
│  Chat          │  Preview                     │  Data Schema     │
│                │                              │                  │
│  [user]        │  ┌── Edit view ────────────┐ │  {               │
│  I want a      │  │  [Form modal rendered]  │ │    title: string │
│  voting widget │  └─────────────────────────┘ │    options: []   │
│                │                              │    votes: {}     │
│  [assistant]   │  ┌── Published view ───────┐ │  }               │
│  Here's what   │  │  [WidgetPost rendered]  │ │                  │
│  I built...    │  └─────────────────────────┘ │                  │
│  [input...]    │                              │                  │
└────────────────┴──────────────────────────────┴──────────────────┘
```

- **Chat**: Conversational AI session. Context is summarized using sliding-window compression to preserve conversation history without hitting token limits.
- **Preview**: Live rendering of the generated widget — both the edit form (modal_template) and the published post (post_template) — side by side as the user iterates.
- **Data Schema**: Visual table representation of `data_schema` so the user understands what data their widget will store. Shown in human-readable table format, not EAV jargon.

### AI Agent Configuration

- **Model**: Gemini (same as the rest of the platform)
- **System Prompt**:

  > You are a Senior Next.js Developer specialized in creating SocialClubs widgets.
  > Given the user's description, generate:
  > 1. A `modal_template` — a JSON object defining the creation form fields
  > 2. A `post_template` — a JSON object defining the published view using the available section types
  > 3. A `data_schema` — a JSON object documenting what data the widget stores
  >
  > All output must conform exactly to the OWP schema format (provided below).
  > Reference examples: [giveaway, countdown, question-box templates]
  > Available section types: [header, text-block, date-display, stat-row, countdown-display, action-button, text-input-action, qa-list]

- **Context preservation**: Conversation messages are summarized every N turns using a dedicated summarization call. The summary replaces the oldest messages while preserving intent.

### Publish Flow (CI/CD Pipeline)

When the creator clicks **Publish**, a verification pipeline runs before the widget is inserted into the database:

```
User clicks Publish
  → Opens naming modal (widget name + SVG icon upload)
  → Submits → CI/CD pipeline starts

Pipeline:
  [1] Schema validation
      • modal_template fields are valid (types, required flags)
      • post_template sections reference only valid section types
      • data_schema keys match fields declared in modal_template + interaction data

  [2] Security review
      • No external URLs in config (prevents data exfiltration via hidden fetch calls)
      • No executable code strings in any template field
      • Section configs only reference known data paths (data.* and cache.*)
      • Rate limit: creator cannot publish more than 5 widgets per 24h

  [3] Quality check
      • Widget has at least 1 field in modal_template
      • Widget has at least 2 sections in post_template
      • Title/description are not empty

  [4] INSERT into widgets table
      • status = 'pending_review' for community widgets
      • status = 'active' for platform widgets (admin only)

User sees live status updates during pipeline (pending → passed/failed per step)
```

Community widgets start as `pending_review`. A human moderator (or automated reviewer) promotes them to `active`, at which point they become available to all clubs.

---

## Widget Marketplace (Vision)

Once Widget Wizard and the review pipeline are live, the platform will support a **Widget Marketplace**:

- **Discovery**: Browse widgets by category (engagement, events, games, productivity, integrations)
- **Ratings**: Club creators rate widgets they've used
- **Creator profiles**: Widgets are attributed to their creator (user or team)
- **Revenue sharing**: Premium widgets (paid tier) share revenue between the platform and the widget creator
- **Versioning**: Widget creators can publish updates; existing instances can opt into upgrades

---

## Creator Incentives

Building widgets for SocialClubs is rewarded through the gamification system:

| Action | Reward |
|--------|--------|
| First widget published | +500 XP + `Widget Builder` badge |
| Widget approved after review | +1,000 XP |
| Widget reaches 100 installations | +2,000 XP + featured in Marketplace |
| Widget reaches 1,000 interactions | Revenue share eligibility |

---

## Platform Widgets (v1.0)

| Slug | Description | Pinned |
|------|-------------|--------|
| `giveaway` | Members join, creator picks winner on draw date | No |
| `countdown` | Live countdown pinned to the channel | Yes |
| `question-box` | Anonymous AMA — members ask, creator answers | No |

---

## Roadmap

- [ ] Widget Wizard UI in Agent Panel
- [ ] OAuth connection flow for external service widgets
- [ ] Widget Marketplace discovery page
- [ ] Widget version upgrades for existing instances
- [ ] Webhook support (widget triggers external HTTP call on interaction)
- [ ] Widget analytics (interaction rates, member engagement per widget type)
