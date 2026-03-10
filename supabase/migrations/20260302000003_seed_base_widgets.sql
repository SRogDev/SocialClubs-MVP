-- ============================================================
-- OPEN WIDGET PROTOCOL — Extended widgets schema
-- ============================================================
-- Adds columns needed for the widget marketplace:
--   status, creator_user_id, version, icon_svg
--   modal_template and post_template stored inside schema jsonb
-- Creates foundation tables for external API integrations + OAuth
-- ============================================================

-- Extended columns on widgets table
ALTER TABLE widgets
  ADD COLUMN IF NOT EXISTS status        text    NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS creator_user_id uuid   REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS version       text    NOT NULL DEFAULT '1.0.0',
  ADD COLUMN IF NOT EXISTS icon_svg      text;

-- Widget API integrations catalog
-- Each widget can declare which external services it needs (Notion, Google Calendar, etc.)
CREATE TABLE IF NOT EXISTS widget_api_integrations (
  id            uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  widget_id     uuid    NOT NULL REFERENCES widgets(id) ON DELETE CASCADE,
  service_name  text    NOT NULL,   -- 'notion', 'google-calendar', 'airtable'
  display_name  text    NOT NULL,   -- 'Notion', 'Google Calendar'
  oauth_config  jsonb   NOT NULL DEFAULT '{}'::jsonb,
  -- expected shape: { auth_url, token_url, client_id_env_var, client_secret_env_var }
  required_scopes text[] NOT NULL DEFAULT '{}',
  created_at    timestamptz DEFAULT now(),
  UNIQUE(widget_id, service_name)
);

-- Per-user OAuth connections to external services
-- Tokens must be encrypted at application level before storage
CREATE TABLE IF NOT EXISTS user_service_connections (
  id                uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid    NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  service_name      text    NOT NULL,
  access_token      text    NOT NULL,   -- AES-256-GCM encrypted
  refresh_token     text,              -- AES-256-GCM encrypted
  token_expires_at  timestamptz,
  scope             text,
  metadata          jsonb   NOT NULL DEFAULT '{}'::jsonb,
  created_at        timestamptz DEFAULT now(),
  updated_at        timestamptz DEFAULT now(),
  UNIQUE(user_id, service_name)
);

-- ============================================================
-- Seed the 3 base platform widgets
-- schema jsonb stores: slug, modal_template, post_template, data_schema
-- ============================================================

INSERT INTO widgets (name, schema, status, version) VALUES

-- ── Giveaway ────────────────────────────────────────────────
('giveaway', '{
  "slug": "giveaway",
  "modal_template": {
    "fields": [
      {"id": "title",      "label": "Giveaway Title",          "type": "text",          "placeholder": "e.g. Win a free premium month!",    "required": true},
      {"id": "prize",      "label": "What are you giving away?","type": "textarea",      "placeholder": "Describe the prize in detail…",      "required": true},
      {"id": "resolve_at", "label": "Draw Date & Time",         "type": "datetime-local","placeholder": "",                                    "required": true}
    ],
    "submit_label": "Launch Giveaway"
  },
  "post_template": {
    "sections": [
      {"type": "header",       "config": {"icon": "Gift", "title_from": "data.title"}},
      {"type": "text-block",   "config": {"label": "Prize", "value_from": "data.prize"}},
      {"type": "date-display", "config": {"label": "Draw date", "value_from": "data.resolve_at", "format": "full"}},
      {"type": "stat-row",     "config": {"stats": [{"label": "joined", "value_from": "cache.participant_count", "default": 0}]}},
      {"type": "action-button","config": {"action": "join", "label": "Join Giveaway", "leave_label": "Leave Giveaway", "user_check": {"array_from": "data.participants", "user_id_field": "user_id"}}}
    ]
  },
  "data_schema": {
    "title":        {"type": "string",   "description": "Giveaway title"},
    "prize":        {"type": "string",   "description": "Prize description"},
    "resolve_at":   {"type": "datetime", "description": "When the winner is picked"},
    "participants": {"type": "array",    "description": "Users who joined", "items": {"user_id": "string", "joined_at": "datetime"}}
  }
}'::jsonb, 'active', '1.0.0'),

-- ── Countdown ───────────────────────────────────────────────
('countdown', '{
  "slug": "countdown",
  "pinned": true,
  "modal_template": {
    "fields": [
      {"id": "title",     "label": "What are you counting down to?", "type": "text",          "placeholder": "e.g. Season Finale, Product Launch…", "required": true},
      {"id": "target_at", "label": "Target Date & Time",             "type": "datetime-local","placeholder": "",                                     "required": true}
    ],
    "submit_label": "Start Countdown"
  },
  "post_template": {
    "sections": [
      {"type": "header",            "config": {"icon": "Timer", "title_from": "data.title"}},
      {"type": "countdown-display", "config": {"target_from": "data.target_at"}}
    ]
  },
  "data_schema": {
    "title":     {"type": "string",   "description": "What you are counting down to"},
    "target_at": {"type": "datetime", "description": "The target date and time"}
  }
}'::jsonb, 'active', '1.0.0'),

-- ── Question Box ────────────────────────────────────────────
('question-box', '{
  "slug": "question-box",
  "modal_template": {
    "fields": [
      {"id": "title", "label": "Topic", "type": "text", "placeholder": "e.g. Ask me anything about fitness!", "required": true}
    ],
    "submit_label": "Open Question Box"
  },
  "post_template": {
    "sections": [
      {"type": "header",            "config": {"icon": "MessageCircleQuestion", "title_from": "data.title"}},
      {"type": "stat-row",          "config": {"stats": [{"label": "questions received", "value_from": "cache.question_count", "default": 0}]}},
      {"type": "qa-list",           "config": {"questions_from": "data.questions", "answer_action": "answer"}},
      {"type": "text-input-action", "config": {"placeholder": "Ask anonymously…", "action": "ask", "payload_key": "text", "submit_label": "Send", "max_length": 300}}
    ]
  },
  "data_schema": {
    "title":     {"type": "string", "description": "Question box topic"},
    "questions": {"type": "array",  "description": "Submitted questions", "items": {"id": "string", "text": "string", "created_at": "datetime", "answer": "string|null"}}
  }
}'::jsonb, 'active', '1.0.0')

ON CONFLICT DO NOTHING;
