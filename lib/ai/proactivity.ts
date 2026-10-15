/**
 * Proactivity permission matrix (ADR-002 §2, master plan Phase 14).
 *
 * Per-club `club_ai_config.proactivity_level`:
 * - 1 = Advisor:    AI drafts, never executes.
 * - 2 = Operator:   auto-executes low-risk; approval for medium+.
 * - 3 = Autonomous: auto low+medium under policy; approval for high/critical.
 *
 * Matrix (action × risk × level → mode):
 * - low risk:      L1 draft, L2 auto, L3 auto
 * - medium risk:   L1 draft, L2 approval, L3 auto
 * - high risk:     always approval (suggest at L1)
 * - critical:      always approval, always human (membership/payment changes)
 */
import type { ActionRisk } from './actions';

export type ActionMode = 'draft' | 'auto' | 'approval';

export type ProactivityLevel = 1 | 2 | 3;

/**
 * Per-action mode overrides. v1: `escalate_to_human` must always be
 * executable — an agent stuck in draft mode must still be able to call
 * for human help.
 */
export const ACTION_MODE_OVERRIDES: Record<string, ActionMode> = {
    escalate_to_human: 'auto',
};

const MATRIX: Record<ActionRisk, Record<ProactivityLevel, ActionMode>> = {
    low: { 1: 'draft', 2: 'auto', 3: 'auto' },
    medium: { 1: 'draft', 2: 'approval', 3: 'auto' },
    high: { 1: 'approval', 2: 'approval', 3: 'approval' },
    critical: { 1: 'approval', 2: 'approval', 3: 'approval' },
};

function isProactivityLevel(value: number): value is ProactivityLevel {
    return value === 1 || value === 2 || value === 3;
}

/** Resolve how an action may proceed given its name, risk, and club level. */
export function resolveActionMode(
    action: string,
    risk: ActionRisk,
    level: number,
): ActionMode {
    const override = ACTION_MODE_OVERRIDES[action];
    if (override !== undefined) return override;
    if (!isProactivityLevel(level)) {
        throw new Error(
            `Invalid proactivity level ${level}: must be 1 (Advisor), 2 (Operator) or 3 (Autonomous).`,
        );
    }
    return MATRIX[risk][level];
}
