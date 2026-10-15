/**
 * AI policy evaluation (ADR-002 §2, master plan Phase 14).
 *
 * `evaluatePolicy({ clubId, agentId, action })` decides whether an
 * agent-proposed action may proceed and in which mode:
 *   - loads the club's `club_ai_config` (defaults to L1 when no row exists);
 *   - denies unknown actions and unknown/disabled agents (deny by default);
 *   - resolves the proactivity level to a mode via proactivity.ts.
 *
 * Storage is injected via the `PolicyDb` interface so unit tests run
 * without a database.
 */
import { getAction, type ActionRisk } from './actions';
import { isAgentEnabled } from './flags';
import {
    resolveActionMode,
    type ActionMode,
    type ProactivityLevel,
} from './proactivity';

/** One row of `club_ai_config` (migration 20261015000002_ai_governance.sql). */
export interface ClubAIConfigRow {
    clubId: string;
    proactivityLevel: number;
    enabledAgents: string[];
    tone: string;
    policies: Record<string, unknown>;
    updatedAt: string;
}

/** Minimal storage surface the policy layer needs. */
export interface PolicyDb {
    getClubAIConfig(clubId: string): Promise<ClubAIConfigRow | null>;
}

/** Defaults for clubs without a `club_ai_config` row: L1, community-manager only. */
export const DEFAULT_CLUB_AI_CONFIG: Omit<ClubAIConfigRow, 'clubId' | 'updatedAt'> = {
    proactivityLevel: 1,
    enabledAgents: ['community-manager'],
    tone: 'friendly',
    policies: {},
};

export interface PolicyRequest {
    clubId: string;
    agentId: string;
    action: string;
}

export interface PolicyDeps {
    db: PolicyDb;
}

export interface PolicyResult {
    allowed: boolean;
    mode: ActionMode;
    requiresReview: boolean;
    reason: string;
    risk?: ActionRisk;
    level?: ProactivityLevel;
}

function clampLevel(raw: number): ProactivityLevel {
    if (raw === 2) return 2;
    if (raw === 3) return 3;
    return 1;
}

function denied(reason: string, risk?: ActionRisk, level?: ProactivityLevel): PolicyResult {
    return { allowed: false, mode: 'approval', requiresReview: true, reason, risk, level };
}

export async function evaluatePolicy(
    req: PolicyRequest,
    deps: PolicyDeps,
): Promise<PolicyResult> {
    // Unknown action: deny by default.
    let risk: ActionRisk;
    try {
        risk = getAction(req.action).risk;
    } catch {
        return denied(`unknown action "${req.action}" (deny by default)`);
    }

    // Unknown or flag-disabled agent: deny by default.
    if (!isAgentEnabled(req.agentId)) {
        return denied(
            `agent "${req.agentId}" is unknown or disabled by feature flag`,
            risk,
        );
    }

    const row = await deps.db.getClubAIConfig(req.clubId);
    const level = clampLevel(row?.proactivityLevel ?? DEFAULT_CLUB_AI_CONFIG.proactivityLevel);
    const enabledAgents = row?.enabledAgents ?? DEFAULT_CLUB_AI_CONFIG.enabledAgents;
    if (!enabledAgents.includes(req.agentId)) {
        return denied(
            `agent "${req.agentId}" is not enabled for club ${req.clubId}`,
            risk,
            level,
        );
    }

    const mode = resolveActionMode(req.action, risk, level);
    // AI reviewer runs for every medium+ risk action (ADR-002 §3).
    const requiresReview = risk !== 'low' || mode === 'approval';
    return {
        allowed: true,
        mode,
        requiresReview,
        reason: `level ${level} ${risk}-risk action "${req.action}" -> ${mode}`,
        risk,
        level,
    };
}
