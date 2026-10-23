-- Minigame Runtime (plan Phase 9 + Roger's refinement, 2026-10-23).
-- AI-generated free-code minigames: drafts in a club game library,
-- server-issued play sessions, bridge-mediated effects only.
--
-- Security posture: every table is service-role only (RLS enabled, no
-- public policies) — all reads/writes flow through lib/games/service.ts
-- behind authenticated API routes, exactly like the AI staff tables.
-- Idempotency is enforced by UNIQUE constraints (game_scores,
-- game_point_awards) so a retried bridge call can never double-apply.

create table if not exists public.games (
    id uuid primary key default gen_random_uuid(),
    club_id uuid not null references public.clubs (id) on delete cascade,
    event_id uuid references public.club_events (id) on delete set null,
    post_id uuid references public.posts (id) on delete set null,
    created_by uuid not null,
    created_by_agent text,
    title text not null,
    prompt text not null,
    brief jsonb not null,
    html text not null,
    capabilities text[] not null default '{}',
    status text not null default 'draft'
        check (status in ('draft', 'published', 'rejected', 'archived')),
    validation jsonb,
    mock boolean not null default false,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);
create index if not exists games_club_status_idx on public.games (club_id, status);

create table if not exists public.game_sessions (
    id uuid primary key default gen_random_uuid(),
    game_id uuid not null references public.games (id) on delete cascade,
    club_id uuid not null references public.clubs (id) on delete cascade,
    user_id uuid not null,
    event_id uuid references public.club_events (id) on delete set null,
    kind text not null default 'play' check (kind in ('play', 'preview')),
    started_at timestamptz not null default now(),
    submissions integer not null default 0,
    awards_used integer not null default 0,
    points_awarded integer not null default 0
);
create index if not exists game_sessions_game_idx on public.game_sessions (game_id);

create table if not exists public.game_scores (
    id uuid primary key default gen_random_uuid(),
    game_id uuid not null references public.games (id) on delete cascade,
    club_id uuid not null references public.clubs (id) on delete cascade,
    event_id uuid references public.club_events (id) on delete set null,
    user_id uuid not null,
    session_id uuid not null references public.game_sessions (id) on delete cascade,
    score integer not null check (score >= 0),
    idempotency_key text not null unique,
    created_at timestamptz not null default now()
);
create index if not exists game_scores_board_idx
    on public.game_scores (game_id, event_id, score desc);

create table if not exists public.game_states (
    id uuid primary key default gen_random_uuid(),
    game_id uuid not null references public.games (id) on delete cascade,
    club_id uuid not null references public.clubs (id) on delete cascade,
    scope text not null check (scope in ('club', 'member')),
    -- Club-scope rows store the sentinel 00000000-0000-0000-0000-000000000000
    -- (Postgres UNIQUE treats NULLs as distinct; the sentinel keeps the
    -- upsert conflict target reliable). Written/read only by the adapter.
    user_id uuid,
    state_key text not null,
    value jsonb,
    expires_at timestamptz,
    updated_at timestamptz not null default now(),
    unique (game_id, club_id, scope, user_id, state_key)
);

create table if not exists public.game_unlocks (
    id uuid primary key default gen_random_uuid(),
    game_id uuid not null references public.games (id) on delete cascade,
    club_id uuid not null references public.clubs (id) on delete cascade,
    user_id uuid not null,
    grant_key text not null,
    expires_at timestamptz,
    created_at timestamptz not null default now()
);
create index if not exists game_unlocks_member_idx
    on public.game_unlocks (club_id, user_id);

create table if not exists public.game_outcomes (
    id uuid primary key default gen_random_uuid(),
    game_id uuid not null references public.games (id) on delete cascade,
    club_id uuid not null references public.clubs (id) on delete cascade,
    user_id uuid not null,
    outcome_type text not null,
    payload jsonb not null default '{}',
    created_at timestamptz not null default now()
);
create index if not exists game_outcomes_club_idx
    on public.game_outcomes (club_id, created_at desc);

create table if not exists public.game_point_awards (
    id uuid primary key default gen_random_uuid(),
    game_id uuid not null references public.games (id) on delete cascade,
    club_id uuid not null references public.clubs (id) on delete cascade,
    user_id uuid not null,
    session_id uuid not null references public.game_sessions (id) on delete cascade,
    points integer not null check (points > 0),
    idempotency_key text not null unique,
    created_at timestamptz not null default now()
);

create table if not exists public.game_bridge_audit (
    id uuid primary key default gen_random_uuid(),
    game_id uuid not null references public.games (id) on delete cascade,
    session_id uuid references public.game_sessions (id) on delete set null,
    user_id uuid not null,
    method text not null,
    ok boolean not null,
    detail text,
    created_at timestamptz not null default now()
);
create index if not exists game_bridge_audit_game_idx
    on public.game_bridge_audit (game_id, created_at desc);

alter table public.games enable row level security;
alter table public.game_sessions enable row level security;
alter table public.game_scores enable row level security;
alter table public.game_states enable row level security;
alter table public.game_unlocks enable row level security;
alter table public.game_outcomes enable row level security;
alter table public.game_point_awards enable row level security;
alter table public.game_bridge_audit enable row level security;
