/**
 * Relationship intelligence — the memory of member relationships
 * (master plan Phases 25-28).
 *
 * `member_signals` is an append-only, club-scoped event log of what a member
 * does in a club: posts ('posted'), likes/comments ('engaged'), declared
 * interests/preferences ('interest', 'preference'), and derived facts
 * ('milestone', 'engagement_drop'). `aggregateProfile` turns those rows into
 * a member profile the AI staff (Community Manager, AI Inbox) can use for
 * personalization. `assessChurnRisk` is a cheap heuristic for re-engagement.
 *
 * Privacy model (non-negotiable):
 * - Signals are ALWAYS scoped to one club (`club_id` on every row) and are
 *   never shared or joined across clubs. There is no cross-club profiling.
 * - No PII inference: this module never guesses age, gender, location, or
 *   any other personal attribute — it only aggregates what the member
 *   explicitly did (posts, engagement, declared preferences).
 * - RLS on `member_signals` is service-role only. `getMemberProfile` does
 *   NOT authorize the caller: the caller MUST enforce club membership first
 *   (e.g. `requireClubRole(requesterId, clubId, [...])`). This is documented
 *   on each entry point.
 *
 * Storage is injected via the `SignalDb` interface (same pattern as
 * `CostDb` in cost.ts) so unit tests run without a database.
 * `supabaseSignalDb()` builds the real adapter from env (service-role key).
 * Server-side only — never import from client components.
 */
import { createClient } from '@supabase/supabase-js';

import { AIAgentError } from './types';

/** Signal types this module knows how to aggregate. The column stays TEXT so
 *  future phases can add types without a migration. */
export const SIGNAL_TYPES = [
    'posted',
    'engaged',
    'interest',
    'engagement_drop',
    'milestone',
    'preference',
] as const;

export type MemberSignalType = (typeof SIGNAL_TYPES)[number];

/** Signal types that count as "activity" for trend and churn heuristics. */
export const ACTIVITY_SIGNAL_TYPES: readonly MemberSignalType[] = ['posted', 'engaged'];

/** One row of `member_signals`. */
export interface MemberSignal {
    id: string;
    club_id: string;
    user_id: string;
    signal_type: string;
    payload: Record<string, unknown>;
    created_at: string;
}

export interface NewMemberSignal {
    club_id: string;
    user_id: string;
    signal_type: string;
    payload?: Record<string, unknown>;
}

export interface RecordSignalInput {
    clubId: string;
    userId: string;
    type: string;
    payload?: Record<string, unknown>;
}

/** Minimal storage surface the relationship layer needs. */
export interface SignalDb {
    insertSignal(row: NewMemberSignal): Promise<MemberSignal>;
    listSignals(clubId: string, userId: string, limit?: number): Promise<MemberSignal[]>;
}

export interface RelationshipDeps {
    db: SignalDb;
    now?: () => Date;
}

/**
 * Real SignalDb backed by Supabase (service-role). Throws AI_DB_UNAVAILABLE
 * when SUPABASE env vars are missing.
 */
export function supabaseSignalDb(): SignalDb {
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
        async insertSignal(row: NewMemberSignal): Promise<MemberSignal> {
            const { data, error } = await supabase
                .from('member_signals')
                .insert({
                    club_id: row.club_id,
                    user_id: row.user_id,
                    signal_type: row.signal_type,
                    payload: row.payload ?? {},
                })
                .select()
                .single();
            if (error) {
                throw new AIAgentError(
                    'AI_DB_UNAVAILABLE',
                    `Failed to insert member_signals row: ${error.message}`,
                );
            }
            return data as MemberSignal;
        },
        async listSignals(
            clubId: string,
            userId: string,
            limit = 500,
        ): Promise<MemberSignal[]> {
            const { data, error } = await supabase
                .from('member_signals')
                .select('*')
                .eq('club_id', clubId)
                .eq('user_id', userId)
                .order('created_at', { ascending: false })
                .limit(limit);
            if (error) {
                throw new AIAgentError(
                    'AI_DB_UNAVAILABLE',
                    `Failed to read member_signals: ${error.message}`,
                );
            }
            return (data as MemberSignal[]) ?? [];
        },
    };
}

function resolveDeps(deps?: RelationshipDeps): RelationshipDeps {
    return deps ?? { db: supabaseSignalDb() };
}

/**
 * Append one signal row. Validates identifiers; throws on DB errors.
 * For fire-and-forget recording inside user actions use `recordSignalSafe`.
 */
export async function recordSignal(
    input: RecordSignalInput,
    deps?: RelationshipDeps,
): Promise<MemberSignal> {
    if (!input.clubId?.trim() || !input.userId?.trim() || !input.type?.trim()) {
        throw new AIAgentError(
            'AI_DB_UNAVAILABLE',
            'recordSignal requires non-empty clubId, userId, and type.',
        );
    }
    const { db } = resolveDeps(deps);
    return db.insertSignal({
        club_id: input.clubId,
        user_id: input.userId,
        signal_type: input.type,
        payload: input.payload ?? {},
    });
}

/**
 * Fire-and-forget recording for use inside user actions (posts, likes,
 * comments). NEVER throws — a failed signal insert must not break the action
 * it annotates. Errors are logged and swallowed.
 */
export async function recordSignalSafe(
    input: RecordSignalInput,
    deps?: RelationshipDeps,
): Promise<void> {
    try {
        await recordSignal(input, deps);
    } catch (err) {
        console.warn('[relationship] signal recording failed (non-fatal):', err);
    }
}

export interface InterestTag {
    tag: string;
    count: number;
}

export interface Milestone {
    label: string;
    at: string;
}

export type EngagementTrend = 'up' | 'flat' | 'down';

export interface MemberProfile {
    clubId: string;
    userId: string;
    /** Top tags from signal payloads, ranked by frequency (max 5). */
    interests: InterestTag[];
    /** Activity in the last 7 days vs the previous 7 days. */
    engagementTrend: EngagementTrend;
    /** 'milestone' signals, newest first. */
    milestones: Milestone[];
    /** Newest activity timestamp, or null when no activity recorded. */
    lastActive: string | null;
    signalCount: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_INTERESTS = 5;

function isActivity(s: MemberSignal): boolean {
    return (ACTIVITY_SIGNAL_TYPES as readonly string[]).includes(s.signal_type);
}

function tagList(payload: Record<string, unknown>): string[] {
    const tags = payload['tags'];
    if (!Array.isArray(tags)) return [];
    return tags.filter((t): t is string => typeof t === 'string' && t.length > 0);
}

function trendFor(activity: MemberSignal[], now: Date): EngagementTrend {
    const weekAgo = now.getTime() - 7 * DAY_MS;
    const twoWeeksAgo = now.getTime() - 14 * DAY_MS;
    let recent = 0;
    let previous = 0;
    for (const s of activity) {
        const t = new Date(s.created_at).getTime();
        if (Number.isNaN(t)) continue;
        if (t >= weekAgo) recent += 1;
        else if (t >= twoWeeksAgo) previous += 1;
    }
    if (previous === 0) return recent > 0 ? 'up' : 'flat';
    const ratio = recent / previous;
    if (ratio > 1.2) return 'up';
    if (ratio < 0.8) return 'down';
    return 'flat';
}

/**
 * Pure aggregation: turns a member's signal rows (already club-scoped by the
 * caller) into a profile. No DB, no auth — deterministic and unit-testable.
 */
export function aggregateProfile(
    clubId: string,
    userId: string,
    signals: MemberSignal[],
    now: Date = new Date(),
): MemberProfile {
    const counts = new Map<string, number>();
    for (const s of signals) {
        for (const tag of tagList(s.payload)) {
            counts.set(tag, (counts.get(tag) ?? 0) + 1);
        }
    }
    const interests: InterestTag[] = [...counts.entries()]
        .map(([tag, count]) => ({ tag, count }))
        .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag))
        .slice(0, MAX_INTERESTS);

    const milestones: Milestone[] = signals
        .filter((s) => s.signal_type === 'milestone')
        .map((s) => ({
            label:
                typeof s.payload['label'] === 'string' && s.payload['label'].length > 0
                    ? (s.payload['label'] as string)
                    : 'milestone',
            at: s.created_at,
        }))
        .sort((a, b) => (a.at < b.at ? 1 : -1));

    const activity = signals.filter(isActivity);
    const lastActive =
        activity.length > 0
            ? activity.reduce((a, b) => (a.created_at > b.created_at ? a : b)).created_at
            : null;

    return {
        clubId,
        userId,
        interests,
        engagementTrend: trendFor(activity, now),
        milestones,
        lastActive,
        signalCount: signals.length,
    };
}

/**
 * Compact, prompt-safe rendering of a member profile (interests first).
 * Used by AI staff drafts for personalization. Never invents data: with no
 * signals it says so explicitly.
 */
export function summarizeProfileForPrompt(profile: MemberProfile | null): string {
    if (!profile || profile.signalCount === 0) {
        return 'No prior activity recorded for this member in this club. Write a general warm draft.';
    }
    const lines: string[] = [];
    if (profile.interests.length > 0) {
        lines.push(
            `Interests: ${profile.interests.map((i) => `${i.tag} (${i.count})`).join(', ')}`,
        );
    } else {
        lines.push('Interests: none recorded yet.');
    }
    lines.push(`Engagement trend: ${profile.engagementTrend}.`);
    if (profile.milestones.length > 0) {
        lines.push(`Milestones: ${profile.milestones.map((m) => m.label).join(', ')}.`);
    }
    return lines.join(' ');
}

/**
 * Load a member's signals (club-scoped) and aggregate them into a profile.
 *
 * AUTHORIZATION: this function does NOT check that the caller may see the
 * member. The caller MUST call `requireClubRole(requesterId, clubId, [...])`
 * first — signals never leave their club, but within a club they are visible
 * to any member the caller authorizes.
 */
export async function getMemberProfile(
    clubId: string,
    userId: string,
    deps?: RelationshipDeps,
): Promise<MemberProfile> {
    const { db, now } = resolveDeps(deps);
    const signals = await db.listSignals(clubId, userId);
    return aggregateProfile(clubId, userId, signals, now ? now() : new Date());
}

export interface ChurnAssessment {
    atRisk: boolean;
    reason: string;
    /** Whole days since the last activity signal, or null when none recorded. */
    daysSinceActive: number | null;
}

/**
 * Pure churn heuristic: a member who WAS active (has activity signals older
 * than 14 days) but has had NO activity in the last 14 days is at risk.
 * New members and members with no recorded activity are never flagged —
 * there is nothing to churn from.
 */
export function assessChurnRisk(
    signals: MemberSignal[],
    now: Date = new Date(),
): ChurnAssessment {
    const activity = signals.filter(isActivity);
    if (activity.length === 0) {
        return {
            atRisk: false,
            reason: 'No activity recorded — nothing to churn from.',
            daysSinceActive: null,
        };
    }
    const sorted = [...activity].sort((a, b) => (a.created_at < b.created_at ? -1 : 1));
    const first = new Date(sorted[0].created_at).getTime();
    const last = new Date(sorted[sorted.length - 1].created_at).getTime();
    const daysSinceActive = Math.max(0, Math.floor((now.getTime() - last) / DAY_MS));
    const previouslyActive = now.getTime() - first >= 14 * DAY_MS;

    if (daysSinceActive >= 14 && previouslyActive) {
        return {
            atRisk: true,
            reason:
                `No activity in ${daysSinceActive} days after ` +
                `${activity.length} prior activity signal(s) — re-engagement candidate.`,
            daysSinceActive,
        };
    }
    return {
        atRisk: false,
        reason:
            daysSinceActive < 14
                ? `Active ${daysSinceActive} day(s) ago — within the healthy window.`
                : 'Activity history too short to assess churn.',
        daysSinceActive,
    };
}

/**
 * Assess churn risk for a club member. Same authorization caveat as
 * `getMemberProfile`: the caller must enforce club membership first.
 */
export async function detectChurnRisk(
    clubId: string,
    userId: string,
    deps?: RelationshipDeps,
): Promise<ChurnAssessment> {
    const { db, now } = resolveDeps(deps);
    const signals = await db.listSignals(clubId, userId);
    return assessChurnRisk(signals, now ? now() : new Date());
}
