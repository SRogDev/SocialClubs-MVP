-- Workstream C1: widget profile sessions for the shared sandbox
-- runtime. Widget artifacts render through per-mount sessions of kind
-- 'widget' (no play-session expiry; still authenticated, club-bound
-- and rate-limited). Extends the kind check from
-- 20261023000001_minigame_runtime.sql.
alter table public.game_sessions
    drop constraint if exists game_sessions_kind_check;
alter table public.game_sessions
    add constraint game_sessions_kind_check
    check (kind in ('play', 'preview', 'widget'));
