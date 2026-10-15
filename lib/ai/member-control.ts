/**
 * Member control over AI (master plan Phases 73-76).
 *
 * Members can opt out of:
 * - `allowPersonalization` — the AI staff builds no member profile and no
 *   personalized content for them (`getMemberProfileWithConsent` returns an
 *   empty profile).
 * - `allowProactiveMessages` — workflows never send proactive messages /
 *   notifications to them (checked at the send point in
 *   `lib/ai/workflows.ts`).
 *
 * Defaults are opt-IN (both true) — the member must explicitly toggle them
 * off. Preferences are club-scoped (one row per user+club).
 *
 * Privacy model (non-negotiable):
 * - Preferences are club-scoped (`club_id` on every row), never joined
 *   across clubs.
 * - RLS on `ai_member_preferences` is service-role only. These functions
 *   do NOT authorize the caller: the preferences API route authenticates
 *   the user and only lets them change THEIR OWN preferences; profile
 *   reads keep their own club-role gates.
 *
 * Storage is injected via the `PreferencesDb` interface (same pattern as
 * `SignalDb` in relationship.ts) so unit tests run without a database.
 * `supabasePreferencesDb()` builds the real adapter from env (service-role).
 * Server-side only — never import from client components.
 */
import { createClient } from '@supabase/supabase-js';

import { aggregateProfile, getMemberProfile, type MemberProfile, type RelationshipDeps } from './relationship';
import { AIAgentError } from './types';

/** One row of `ai_member_preferences`. */
export interface MemberAiPreferences {
    user_id: string;
    club_id: string;
    allow_personalization: boolean;
    allow_proactive_messages: boolean;
    updated_at: string;
}

/** Resolved preferences as the rest of the codebase consumes them. */
export interface ResolvedMemberPreferences {
    allowPersonalization: boolean;
    allowProactiveMessages: boolean;
}

export interface PreferencesInput {
    allowPersonalization?: boolean;
    allowProactiveMessages?: boolean;
}

/** Opt-in defaults: the member must explicitly toggle these off. */
export const DEFAULT_MEMBER_PREFERENCES: ResolvedMemberPreferences = {
    allowPersonalization: true,
    allowProactiveMessages: true,
};

/** Prompt note used when personalization is disabled — the AI writes a
 *  general warm draft instead of a personalized one. */
export const PERSONALIZATION_OPT_OUT_NOTE =
    'This member opted out of AI personalization. Write a general warm draft with no personal details, interests, or history.';

/** Minimal storage surface the member-control layer needs. */
export interface PreferencesDb {
    getPreferences(userId: string, clubId: string): Promise<MemberAiPreferences | null>;
    upsertPreferences(
        userId: string,
        clubId: string,
        values: { allow_personalization: boolean; allow_proactive_messages: boolean },
    ): Promise<MemberAiPreferences>;
}

export interface PreferencesDeps {
    db: PreferencesDb;
}

/**
 * Real PreferencesDb backed by Supabase (service-role). Throws
 * AI_DB_UNAVAILABLE when SUPABASE env vars are missing.
 */
export function supabasePreferencesDb(): PreferencesDb {
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
        async getPreferences(userId: string, clubId: string): Promise<MemberAiPreferences | null> {
            const { data, error } = await supabase
                .from('ai_member_preferences')
                .select('*')
                .eq('user_id', userId)
                .eq('club_id', clubId)
                .maybeSingle();
            if (error) {
                throw new AIAgentError(
                    'AI_DB_UNAVAILABLE',
                    `Failed to read ai_member_preferences: ${error.message}`,
                );
            }
            return (data as MemberAiPreferences | null) ?? null;
        },
        async upsertPreferences(
            userId: string,
            clubId: string,
            values: { allow_personalization: boolean; allow_proactive_messages: boolean },
        ): Promise<MemberAiPreferences> {
            const { data, error } = await supabase
                .from('ai_member_preferences')
                .upsert(
                    {
                        user_id: userId,
                        club_id: clubId,
                        allow_personalization: values.allow_personalization,
                        allow_proactive_messages: values.allow_proactive_messages,
                        updated_at: new Date().toISOString(),
                    },
                    { onConflict: 'user_id,club_id' },
                )
                .select()
                .single();
            if (error) {
                throw new AIAgentError(
                    'AI_DB_UNAVAILABLE',
                    `Failed to upsert ai_member_preferences row: ${error.message}`,
                );
            }
            return data as MemberAiPreferences;
        },
    };
}

function resolveDeps(deps?: PreferencesDeps): PreferencesDeps {
    return deps ?? { db: supabasePreferencesDb() };
}

function toResolved(row: MemberAiPreferences | null): ResolvedMemberPreferences {
    if (!row) return { ...DEFAULT_MEMBER_PREFERENCES };
    return {
        allowPersonalization: row.allow_personalization,
        allowProactiveMessages: row.allow_proactive_messages,
    };
}

function requireNonEmpty(name: string, value: string): void {
    if (!value?.trim()) {
        throw new AIAgentError(
            'AI_DB_UNAVAILABLE',
            `member-control requires a non-empty ${name}.`,
        );
    }
}

/**
 * The member's AI preferences for a club, resolved against the opt-in
 * defaults. No row yet = defaults (personalization + proactive ON).
 */
export async function getMemberPreferences(
    userId: string,
    clubId: string,
    deps?: PreferencesDeps,
): Promise<ResolvedMemberPreferences> {
    requireNonEmpty('userId', userId);
    requireNonEmpty('clubId', clubId);
    const { db } = resolveDeps(deps);
    return toResolved(await db.getPreferences(userId, clubId));
}

/**
 * Save (partial) AI preferences for a member in a club. Unspecified flags
 * keep their current value (or the default when no row exists yet).
 * Values must be booleans — anything else throws.
 */
export async function setMemberPreferences(
    userId: string,
    clubId: string,
    input: PreferencesInput,
    deps?: PreferencesDeps,
): Promise<ResolvedMemberPreferences> {
    requireNonEmpty('userId', userId);
    requireNonEmpty('clubId', clubId);
    for (const [key, value] of Object.entries(input)) {
        if (value !== undefined && typeof value !== 'boolean') {
            throw new AIAgentError(
                'AI_DB_UNAVAILABLE',
                `setMemberPreferences: "${key}" must be a boolean.`,
            );
        }
    }
    const { db } = resolveDeps(deps);
    const current = await getMemberPreferences(userId, clubId, { db });
    const next: ResolvedMemberPreferences = {
        allowPersonalization: input.allowPersonalization ?? current.allowPersonalization,
        allowProactiveMessages: input.allowProactiveMessages ?? current.allowProactiveMessages,
    };
    const row = await db.upsertPreferences(userId, clubId, {
        allow_personalization: next.allowPersonalization,
        allow_proactive_messages: next.allowProactiveMessages,
    });
    return toResolved(row);
}

/** True when the member opted out of personalization. */
export function shouldSkipPersonalization(prefs: ResolvedMemberPreferences): boolean {
    return prefs.allowPersonalization === false;
}

/** True when the member opted out of proactive AI messages. */
export function shouldSkipProactiveSend(prefs: ResolvedMemberPreferences): boolean {
    return prefs.allowProactiveMessages === false;
}

export interface MemberControlDeps {
    prefs?: PreferencesDeps;
    signals?: RelationshipDeps;
}

/**
 * Consent-aware member profile: when the member opted out of
 * personalization, this returns an EMPTY profile (zero signals) — the same
 * shape `aggregateProfile` produces for a member with no history, so every
 * downstream consumer (prompt summaries, the profile API) degrades to the
 * no-activity branch instead of personalizing.
 *
 * AUTHORIZATION: same caveat as `getMemberProfile` — the caller MUST enforce
 * club membership/roles first.
 */
export async function getMemberProfileWithConsent(
    clubId: string,
    userId: string,
    deps?: MemberControlDeps,
): Promise<MemberProfile> {
    requireNonEmpty('clubId', clubId);
    requireNonEmpty('userId', userId);
    const prefs = await getMemberPreferences(userId, clubId, deps?.prefs);
    if (shouldSkipPersonalization(prefs)) {
        return aggregateProfile(clubId, userId, []);
    }
    return getMemberProfile(clubId, userId, deps?.signals);
}
