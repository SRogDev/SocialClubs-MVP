/**
 * Sentient UI — recommendation engine (master plan Phases 58-62).
 *
 * Structured recommendations for the dashboard (SmartPanel), NOT a chatbot.
 * `buildRecommendations` is pure: it turns already-fetched, club-scoped data
 * into UI-ready recommendations. `getRecommendations` is the async wrapper
 * that fetches that data through an injected `RecommendationDb` (same pattern
 * as `SignalDb` in relationship.ts) so unit tests run without a database.
 *
 * Data sources (real tables, no LLM):
 * - `ai_signals`     — club-level signal log (lib/ai/signals.ts; types
 *                      'new_post', 'member_joined', 'points_milestone', …).
 *                      Member identity lives in payload.userId/authorId/
 *                      recipientId (there is no user_id column).
 * - `member_signals` — per-member activity (churn detection);
 * - `ai_drafts`      — pending drafts ("Bandeja IA" highlight);
 * - `events`         — upcoming events highlight.
 *
 * Every recommendation explains its reason in `body` ("porque X").
 * Churn nudges name individual members, so they are staff-only
 * (owner/admin/moderator) — plain members never see who went quiet.
 *
 * Server-side only — never import from client components.
 */
import { createClient } from '@supabase/supabase-js';

import type { ClubRole } from '@/lib/authz';

import { AIAgentError } from './types';

export type RecommendationKind = 'suggest_action' | 'highlight' | 'nudge' | 'insight';

export interface RecommendationAction {
    label: string;
    href: string;
}

export interface UIRecommendation {
    id: string;
    clubId: string;
    /** Member the recommendation is about (churn nudges, welcomes). */
    userId?: string;
    kind: RecommendationKind;
    title: string;
    /** Always explains the reason ("porque X"). */
    body: string;
    action?: RecommendationAction;
    /** 1-5, 5 = most urgent. */
    priority: 1 | 2 | 3 | 4 | 5;
    /** ISO timestamp; clients hide expired recommendations. */
    expiresAt: string;
}

/** One club member with their aggregated activity (input to the engine). */
export interface MemberActivity {
    userId: string;
    name: string | null;
    /** Newest activity timestamp, or null when never active. */
    lastActiveAt: string | null;
    everActive: boolean;
}

/** One pending AI draft (input to the engine). */
export interface DraftSummary {
    id: string;
    title: string;
    workflowName: string;
    createdAt: string;
}

/** One club-level signal row, normalized (input to the engine). */
export interface ClubSignalSummary {
    id: string;
    /** From payload.userId/authorId/recipientId (ai_signals has no user_id column). */
    userId: string | null;
    type: string;
    payload: Record<string, unknown>;
    createdAt: string;
}

/** One upcoming club event (input to the engine). */
export interface UpcomingEvent {
    id: string;
    title: string;
    startsAt: string;
}

export interface RecommendationInput {
    clubId: string;
    requesterUserId: string;
    requesterRole: ClubRole;
    members: MemberActivity[];
    pendingDrafts: DraftSummary[];
    clubSignals: ClubSignalSummary[];
    upcomingEvents: UpcomingEvent[];
}

/** Signal types that count as "activity" for the quiet-club check and pulse. */
const ACTIVITY_TYPES = ['new_post', 'member_joined', 'points_milestone'] as const;

const DAY_MS = 24 * 60 * 60 * 1000;
const CHURN_DAYS = 14;
const WELCOME_DAYS = 7;
const QUIET_DAYS = 7;
const EVENT_HORIZON_DAYS = 7;
const MAX_CHURN_NUDGES = 3;
const MAX_WELCOMES = 2;
const MAX_EVENT_HIGHLIGHTS = 2;

const STAFF_ROLES: readonly ClubRole[] = ['owner', 'admin', 'moderator'];

function isStaff(role: ClubRole): boolean {
    return (STAFF_ROLES as readonly string[]).includes(role);
}

function daysBetween(a: Date, b: Date): number {
    return Math.floor(Math.abs(a.getTime() - b.getTime()) / DAY_MS);
}

function displayName(m: MemberActivity): string {
    return m.name && m.name.trim().length > 0 ? m.name : 'Un miembro';
}

/**
 * Pure recommendation builder. Deterministic: same input + same `now` →
 * same output. Sorted by priority (highest first); never returns expired
 * entries (expiresAt is always in the future relative to `now`).
 */
export function buildRecommendations(
    input: RecommendationInput,
    now: Date = new Date(),
): UIRecommendation[] {
    const recs: UIRecommendation[] = [];
    const { clubId } = input;

    // 1. Churn nudges — staff only. Members active before but quiet for
    //    CHURN_DAYS. Longest-quiet first, bounded to MAX_CHURN_NUDGES.
    if (isStaff(input.requesterRole)) {
        const churned = input.members
            .filter((m) => m.everActive && m.lastActiveAt !== null)
            .map((m) => ({ m, quietDays: daysBetween(now, new Date(m.lastActiveAt as string)) }))
            .filter(({ quietDays }) => quietDays >= CHURN_DAYS)
            .sort((a, b) => b.quietDays - a.quietDays)
            .slice(0, MAX_CHURN_NUDGES);
        for (const { m, quietDays } of churned) {
            const name = displayName(m);
            recs.push({
                id: `${clubId}:churn:${m.userId}`,
                clubId,
                userId: m.userId,
                kind: 'nudge',
                title: `Escríbele a ${name}`,
                body: `Lleva ${quietDays} días sin actividad en el club. Un mensaje personal suele traer de vuelta a los miembros que se enfrían.`,
                action: { label: 'Ver miembros', href: `/clubs/${clubId}/panel/members` },
                priority: 4,
                expiresAt: new Date(now.getTime() + 7 * DAY_MS).toISOString(),
            });
        }
    }

    // 2. Welcome nudges — members who joined in the last WELCOME_DAYS and
    //    never became active. Visible to everyone (welcoming is communal).
    const welcomed = new Set<string>();
    const joins = input.clubSignals
        .filter((s) => s.type === 'member_joined')
        .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    for (const join of joins) {
        if (!join.userId || welcomed.has(join.userId)) continue;
        if (daysBetween(now, new Date(join.createdAt)) > WELCOME_DAYS) continue;
        const m = input.members.find((mm) => mm.userId === join.userId);
        if (m && m.everActive) continue;
        welcomed.add(join.userId);
        if (welcomed.size > MAX_WELCOMES) break;
        const name = m ? displayName(m) : 'un nuevo miembro';
        recs.push({
            id: `${clubId}:welcome:${join.userId}`,
            clubId,
            userId: join.userId,
            kind: 'suggest_action',
            title: `Dale la bienvenida a ${name}`,
            body: `Se unió hace poco y aún no participa, porque nadie le ha dado la bienvenida todavía. Un saludo en el chat rompe el hielo.`,
            priority: 3,
            expiresAt: new Date(now.getTime() + WELCOME_DAYS * DAY_MS).toISOString(),
        });
    }

    // 3. Pending drafts highlight — the "Bandeja IA" is never empty for long.
    if (input.pendingDrafts.length > 0) {
        const n = input.pendingDrafts.length;
        recs.push({
            id: `${clubId}:drafts:pending`,
            clubId,
            kind: 'highlight',
            title: n === 1 ? 'Tienes 1 borrador en la Bandeja IA' : `Tienes ${n} borradores en la Bandeja IA`,
            body: `El staff de IA preparó ${n === 1 ? 'este borrador' : 'estos borradores'} porque detectó algo que merece tu atención. Revísalos antes de que pierdan vigencia.`,
            action: { label: 'Revisar bandeja', href: `/clubs/${clubId}/panel` },
            priority: 3,
            expiresAt: new Date(now.getTime() + 3 * DAY_MS).toISOString(),
        });
    }

    // 4. Upcoming events highlight — from the events table (future startsAt
    //    inside the horizon), sorted soonest first.
    const upcoming = input.upcomingEvents
        .map((e) => ({ e, at: new Date(e.startsAt) }))
        .filter(({ at }) => !Number.isNaN(at.getTime()) && at.getTime() > now.getTime() && at.getTime() - now.getTime() <= EVENT_HORIZON_DAYS * DAY_MS)
        .sort((a, b) => a.at.getTime() - b.at.getTime())
        .slice(0, MAX_EVENT_HIGHLIGHTS);
    for (const { e, at } of upcoming) {
        const inDays = Math.max(1, Math.ceil((at.getTime() - now.getTime()) / DAY_MS));
        recs.push({
            id: `${clubId}:event:${e.id}`,
            clubId,
            kind: 'highlight',
            title: `Se acerca: ${e.title}`,
            body: `El evento es en ${inDays === 1 ? '1 día' : `${inDays} días`} porque el club lo programó para esta semana. Recuérdaselo a los miembros para llenar el cupo.`,
            action: { label: 'Ver eventos', href: `/clubs/${clubId}/eventos` },
            priority: 3,
            expiresAt: at.toISOString(),
        });
    }

    // 5. Quiet-club insight — no activity signals in the last QUIET_DAYS.
    const recentActivity = input.clubSignals.filter(
        (s) =>
            (ACTIVITY_TYPES as readonly string[]).includes(s.type) &&
            now.getTime() - new Date(s.createdAt).getTime() <= QUIET_DAYS * DAY_MS,
    );
    if (recentActivity.length === 0 && input.members.length > 0) {
        recs.push({
            id: `${clubId}:quiet:club`,
            clubId,
            kind: 'insight',
            title: 'El club está tranquilo esta semana',
            body: `No ha habido actividad en los últimos ${QUIET_DAYS} días porque nadie ha publicado ni se ha unido. Un post tuyo suele reactivar la conversación.`,
            action: { label: 'Publicar algo', href: `/clubs/${clubId}` },
            priority: 2,
            expiresAt: new Date(now.getTime() + 3 * DAY_MS).toISOString(),
        });
    }

    // Highest priority first; stable for equal priorities.
    return recs.sort((a, b) => b.priority - a.priority);
}

/** Club pulse level: green / yellow / red, purely derived from signal counts. */
export type PulseLevel = 'active' | 'steady' | 'quiet';

export interface ClubPulse {
    level: PulseLevel;
    /** 0-100 score over the window. */
    score: number;
    activityCount: number;
    windowHours: number;
    updatedAt: string;
}

export interface PulseInput {
    clubSignals: ClubSignalSummary[];
}

const PULSE_WINDOW_HOURS = 24;
const PULSE_ACTIVE_THRESHOLD = 8;
const PULSE_STEADY_THRESHOLD = 1;

/**
 * Pure pulse computation: counts activity signals in the trailing
 * PULSE_WINDOW_HOURS. No LLM, no heuristics beyond fixed thresholds.
 */
export function computePulse(input: PulseInput, now: Date = new Date()): ClubPulse {
    const windowStart = now.getTime() - PULSE_WINDOW_HOURS * 3600 * 1000;
    const activityCount = input.clubSignals.filter(
        (s) =>
            (ACTIVITY_TYPES as readonly string[]).includes(s.type) &&
            new Date(s.createdAt).getTime() >= windowStart,
    ).length;
    const level: PulseLevel =
        activityCount >= PULSE_ACTIVE_THRESHOLD
            ? 'active'
            : activityCount >= PULSE_STEADY_THRESHOLD
              ? 'steady'
              : 'quiet';
    return {
        level,
        score: Math.min(100, Math.round((activityCount / PULSE_ACTIVE_THRESHOLD) * 100)),
        activityCount,
        windowHours: PULSE_WINDOW_HOURS,
        updatedAt: now.toISOString(),
    };
}

/** Minimal storage surface the recommendation layer needs (injected for tests). */
export interface RecommendationDb {
    listMembers(clubId: string): Promise<MemberActivity[]>;
    listPendingDrafts(clubId: string): Promise<DraftSummary[]>;
    listClubSignals(clubId: string, since: Date): Promise<ClubSignalSummary[]>;
    listUpcomingEvents(clubId: string): Promise<UpcomingEvent[]>;
}

export interface RecommendationDeps {
    db: RecommendationDb;
    now?: () => Date;
}

/**
 * Extract the member a signal is about from its payload (ai_signals has no
 * user_id column — see lib/ai/signals.ts `recipientOf`).
 */
export function signalUserId(payload: Record<string, unknown>): string | null {
    for (const key of ['userId', 'authorId', 'recipientId']) {
        const v = payload[key];
        if (typeof v === 'string' && v.length > 0) return v;
    }
    return null;
}

/**
 * Async wrapper: fetches club data through the injected db and returns
 * UI-ready recommendations. Does NOT authorize the caller — the route must
 * enforce club membership (requireClubRole) before calling this.
 */
export async function getRecommendations(
    clubId: string,
    requester: { userId: string; role: ClubRole },
    deps: RecommendationDeps,
): Promise<UIRecommendation[]> {
    const now = deps.now ? deps.now() : new Date();
    const [members, pendingDrafts, clubSignals, upcomingEvents] = await Promise.all([
        deps.db.listMembers(clubId),
        deps.db.listPendingDrafts(clubId),
        deps.db.listClubSignals(clubId, new Date(now.getTime() - 30 * DAY_MS)),
        deps.db.listUpcomingEvents(clubId),
    ]);
    return buildRecommendations(
        {
            clubId,
            requesterUserId: requester.userId,
            requesterRole: requester.role,
            members,
            pendingDrafts,
            clubSignals,
            upcomingEvents,
        },
        now,
    );
}

/**
 * Async wrapper for the pulse: fetches the last PULSE_WINDOW_HOURS of
 * club signals. Same authorization note as getRecommendations.
 */
export async function getPulse(
    clubId: string,
    deps: RecommendationDeps,
): Promise<ClubPulse> {
    const now = deps.now ? deps.now() : new Date();
    const clubSignals = await deps.db.listClubSignals(
        clubId,
        new Date(now.getTime() - PULSE_WINDOW_HOURS * 3600 * 1000),
    );
    return computePulse({ clubSignals }, now);
}

/** Extract the member name from a `users(name)` join (object or array shape). */
function pickName(users: unknown): string | null {
    if (!users) return null;
    const u = Array.isArray(users) ? users[0] : users;
    if (typeof u === 'object' && u !== null && typeof (u as { name?: unknown }).name === 'string') {
        return (u as { name: string }).name;
    }
    return null;
}

/**
 * Real RecommendationDb backed by Supabase (service-role). Throws
 * AI_DB_UNAVAILABLE when the env vars are missing. Server-side only.
 */
export function supabaseRecommendationDb(): RecommendationDb {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !serviceKey) {
        throw new AIAgentError(
            'AI_DB_UNAVAILABLE',
            'Supabase env (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY) is not configured.',
        );
    }
    const supabase = createClient(url, serviceKey);

    return {
        async listMembers(clubId: string): Promise<MemberActivity[]> {
            const { data: memberships, error: mErr } = await supabase
                .from('users_clubs')
                .select('user_id, users(name)')
                .eq('club_id', clubId);
            if (mErr) {
                throw new AIAgentError('AI_DB_UNAVAILABLE', `Failed to list club members: ${mErr.message}`);
            }
            const { data: signals, error: sErr } = await supabase
                .from('member_signals')
                .select('user_id, created_at')
                .eq('club_id', clubId)
                .order('created_at', { ascending: false })
                .limit(5000);
            if (sErr) {
                throw new AIAgentError('AI_DB_UNAVAILABLE', `Failed to read member_signals: ${sErr.message}`);
            }
            const lastActive = new Map<string, string>();
            for (const row of (signals ?? []) as { user_id: string; created_at: string }[]) {
                if (!lastActive.has(row.user_id)) lastActive.set(row.user_id, row.created_at);
            }
            return ((memberships ?? []) as { user_id: string; users: unknown }[]).map(
                (m) => ({
                    userId: m.user_id,
                    name: pickName(m.users),
                    lastActiveAt: lastActive.get(m.user_id) ?? null,
                    everActive: lastActive.has(m.user_id),
                }),
            );
        },

        async listPendingDrafts(clubId: string): Promise<DraftSummary[]> {
            const { data, error } = await supabase
                .from('ai_drafts')
                .select('id, title, workflow_name, created_at')
                .eq('club_id', clubId)
                .eq('status', 'pending_approval')
                .order('created_at', { ascending: false })
                .limit(50);
            if (error) {
                throw new AIAgentError('AI_DB_UNAVAILABLE', `Failed to read ai_drafts: ${error.message}`);
            }
            return ((data ?? []) as { id: string; title: string; workflow_name: string; created_at: string }[]).map(
                (d) => ({ id: d.id, title: d.title, workflowName: d.workflow_name, createdAt: d.created_at }),
            );
        },

        async listClubSignals(clubId: string, since: Date): Promise<ClubSignalSummary[]> {
            const { data, error } = await supabase
                .from('ai_signals')
                .select('id, type, payload, created_at')
                .eq('club_id', clubId)
                .gte('created_at', since.toISOString())
                .order('created_at', { ascending: false })
                .limit(1000);
            if (error) {
                throw new AIAgentError('AI_DB_UNAVAILABLE', `Failed to read ai_signals: ${error.message}`);
            }
            return ((data ?? []) as {
                id: string;
                type: string;
                payload: Record<string, unknown>;
                created_at: string;
            }[]).map((s) => ({
                id: s.id,
                userId: signalUserId(s.payload ?? {}),
                type: s.type,
                payload: s.payload ?? {},
                createdAt: s.created_at,
            }));
        },

        async listUpcomingEvents(clubId: string): Promise<UpcomingEvent[]> {
            const { data, error } = await supabase
                .from('events')
                .select('id, title, starts_at')
                .eq('club_id', clubId)
                .neq('status', 'cancelled')
                .gte('starts_at', new Date().toISOString())
                .order('starts_at', { ascending: true })
                .limit(5);
            if (error) {
                throw new AIAgentError('AI_DB_UNAVAILABLE', `Failed to read events: ${error.message}`);
            }
            return ((data ?? []) as { id: string; title: string; starts_at: string }[]).map((e) => ({
                id: e.id,
                title: e.title,
                startsAt: e.starts_at,
            }));
        },
    };
}
