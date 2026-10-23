-- External app integrations (Workstream C, Composio-first).
-- A binding records that a club's creator connected an app FOR THIS
-- CLUB. Executions resolve connected accounts ONLY through these
-- rows (per-club isolation boundary). OAuth tokens themselves live
-- at the provider (Composio); this table stores no credentials.
-- RLS on, no public policies: service-role access via
-- lib/integrations/connections.ts behind authenticated routes only.

create table if not exists public.club_external_connections (
    id uuid primary key default gen_random_uuid(),
    club_id uuid not null references public.clubs (id) on delete cascade,
    creator_user_id uuid not null,
    toolkit_slug text not null,
    connected_account_id text not null,
    status text not null default 'active' check (status in ('active', 'inactive')),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (club_id, toolkit_slug)
);
create index if not exists club_external_connections_club_idx
    on public.club_external_connections (club_id);

alter table public.club_external_connections enable row level security;
