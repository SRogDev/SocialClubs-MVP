/**
 * Feature flags for the SocialClubs AI Staff (ADR-001, plan Phase 63).
 *
 * Every flag is env-based and defaults OFF. A flag is ON only when its env
 * var is exactly "1" or "true" (case-insensitive). Anything else — unset,
 * empty, "0", "yes" — is OFF.
 *
 * `isAgentEnabled(agentId)` additionally requires the master flag
 * AI_STAFF_ENABLED, so the whole AI staff can be killed with one var.
 */

export const AI_STAFF_ENABLED = 'AI_STAFF_ENABLED';

export const AI_COMMUNITY_MANAGER = 'AI_COMMUNITY_MANAGER';
export const AI_EXPERIENCE_DIRECTOR = 'AI_EXPERIENCE_DIRECTOR';
export const AI_CREATOR_COPILOT = 'AI_CREATOR_COPILOT';
export const AI_INBOX = 'AI_INBOX';
export const AI_MODERATION = 'AI_MODERATION';
export const AI_SENTIENT_UI = 'AI_SENTIENT_UI';
export const AI_WIDGETS = 'AI_WIDGETS';

export const ALL_AI_FLAGS = [
    AI_STAFF_ENABLED,
    AI_COMMUNITY_MANAGER,
    AI_EXPERIENCE_DIRECTOR,
    AI_CREATOR_COPILOT,
    AI_INBOX,
    AI_MODERATION,
    AI_SENTIENT_UI,
    AI_WIDGETS,
] as const;

/** Agent definition id -> env flag that gates it. `null` = unknown agent. */
const AGENT_TO_FLAG: Record<string, string> = {
    'community-manager': AI_COMMUNITY_MANAGER,
    'experience-director': AI_EXPERIENCE_DIRECTOR,
    'creator-copilot': AI_CREATOR_COPILOT,
    'ai-inbox': AI_INBOX,
    moderation: AI_MODERATION,
    'sentient-ui': AI_SENTIENT_UI,
    widgets: AI_WIDGETS,
};

export function isEnabled(flagName: string): boolean {
    const raw = process.env[flagName];
    if (raw === undefined) return false;
    const v = raw.trim().toLowerCase();
    return v === '1' || v === 'true';
}

/** Returns the env flag name gating an agent id, or null when unknown. */
export function agentFlagFor(agentId: string): string | null {
    return AGENT_TO_FLAG[agentId] ?? null;
}

/**
 * True only when the master AI_STAFF_ENABLED flag AND the agent's own flag
 * are both ON. Unknown agent ids are never enabled.
 */
export function isAgentEnabled(agentId: string): boolean {
    if (!isEnabled(AI_STAFF_ENABLED)) return false;
    const flag = agentFlagFor(agentId);
    if (flag === null) return false;
    return isEnabled(flag);
}
