/**
 * AI cost observability (master plan Phases 69-72).
 *
 * Read-side analytics over `ai_usage` / `ai_budgets`:
 * - `getClubSpend(clubId, month)` — totals + per-agent + per-action breakdown.
 * - `getBudgetStatus(clubId)` — cap vs spent, % used, projected overrun.
 * - `getPlatformSpend(month)` — cross-club aggregate (for Roger).
 * - `maybeSendBudgetAlert(clubId, deps)` — at >= 80% of the monthly cap,
 *   sends a one-per-period `budget_warning` notification to the club creator
 *   via the existing `notifications` table path.
 *
 * Costs are sized to fit inside the platform margin (ADR-001): the dashboard
 * states this explicitly, and the budget cap is the hard backstop.
 * Server-side only — never import from client components.
 */
import { createClient } from '@supabase/supabase-js';

import {
    getOrCreateBudget,
    type CostDeps,
    type UsageRow,
} from './cost';
import { AIAgentError } from './types';

/** Month identifier, YYYY-MM. */
const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

function monthBounds(month: string): { since: string; until: string } {
    if (!MONTH_RE.test(month)) {
        throw new AIAgentError(
            'AI_OUTPUT_INVALID',
            `Invalid month "${month}" — expected YYYY-MM.`,
        );
    }
    const [y, m] = month.split('-').map(Number);
    const since = new Date(Date.UTC(y, m - 1, 1));
    const until = new Date(Date.UTC(y, m, 1));
    return { since: since.toISOString(), until: until.toISOString() };
}

export interface AgentSpend {
    agentId: string;
    calls: number;
    promptTokens: number;
    completionTokens: number;
    costUsd: number;
}

export interface WorkflowSpend {
    workflow: string;
    calls: number;
    promptTokens: number;
    completionTokens: number;
    costUsd: number;
}

export interface ClubSpend {
    clubId: string;
    month: string;
    calls: number;
    totalPromptTokens: number;
    totalCompletionTokens: number;
    totalCostUsd: number;
    byAgent: AgentSpend[];
    byWorkflow: WorkflowSpend[];
}

function emptyBreakdown(): {
    calls: number;
    promptTokens: number;
    completionTokens: number;
    costUsd: number;
} {
    return { calls: 0, promptTokens: 0, completionTokens: 0, costUsd: 0 };
}

function round6(n: number): number {
    return Math.round(n * 1e6) / 1e6;
}

/**
 * Total tokens + cost for one club in one calendar month, broken down by
 * agent and by workflow (action).
 */
export async function getClubSpend(
    clubId: string,
    month: string,
    deps: CostDeps,
): Promise<ClubSpend> {
    const { since, until } = monthBounds(month);
    const rows: UsageRow[] = await deps.db.listUsage({ clubId, since, until });

    const byAgent = new Map<string, AgentSpend>();
    const byWorkflow = new Map<string, WorkflowSpend>();
    const total = emptyBreakdown();

    for (const row of rows) {
        total.calls += 1;
        total.promptTokens += row.prompt_tokens;
        total.completionTokens += row.completion_tokens;
        total.costUsd += row.cost_usd;

        let agent = byAgent.get(row.agent_id);
        if (!agent) {
            agent = { agentId: row.agent_id, ...emptyBreakdown() };
            byAgent.set(row.agent_id, agent);
        }
        agent.calls += 1;
        agent.promptTokens += row.prompt_tokens;
        agent.completionTokens += row.completion_tokens;
        agent.costUsd += row.cost_usd;

        let workflow = byWorkflow.get(row.workflow);
        if (!workflow) {
            workflow = { workflow: row.workflow, ...emptyBreakdown() };
            byWorkflow.set(row.workflow, workflow);
        }
        workflow.calls += 1;
        workflow.promptTokens += row.prompt_tokens;
        workflow.completionTokens += row.completion_tokens;
        workflow.costUsd += row.cost_usd;
    }

    const byCostDesc = <T extends { costUsd: number }>(a: T, b: T) => b.costUsd - a.costUsd;

    return {
        clubId,
        month,
        calls: total.calls,
        totalPromptTokens: total.promptTokens,
        totalCompletionTokens: total.completionTokens,
        totalCostUsd: round6(total.costUsd),
        byAgent: [...byAgent.values()]
            .map((a) => ({ ...a, costUsd: round6(a.costUsd) }))
            .sort(byCostDesc),
        byWorkflow: [...byWorkflow.values()]
            .map((w) => ({ ...w, costUsd: round6(w.costUsd) }))
            .sort(byCostDesc),
    };
}

export type WarningLevel = 'ok' | 'warning' | 'critical';

/** Fraction of the monthly cap that triggers the budget warning. */
export const BUDGET_WARNING_THRESHOLD = 0.8;

export interface BudgetStatus {
    clubId: string;
    /** First day of the current billing period, YYYY-MM-DD. */
    periodStart: string;
    monthlyCapUsd: number;
    spentUsd: number;
    remainingUsd: number;
    /** 0-100+, may exceed 100 when the cap is breached. */
    percentUsed: number;
    /** Linear projection of end-of-month spend from the current pace. */
    projectedSpendUsd: number;
    /** max(0, projectedSpendUsd - monthlyCapUsd). */
    projectedOverrunUsd: number;
    warningLevel: WarningLevel;
    disabled: boolean;
}

function daysInMonthUtc(year: number, monthIndex: number): number {
    return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
}

/**
 * Budget vs spent for a club: % used, remaining, warning level, and a
 * linear end-of-month projection (spend so far ÷ days elapsed × days in
 * month). The projection is a pace estimate, not a forecast — it is only
 * meaningful mid-month.
 */
export async function getBudgetStatus(
    clubId: string,
    deps: CostDeps,
): Promise<BudgetStatus> {
    const budget = await getOrCreateBudget(clubId, deps);
    const now = deps.now ? deps.now() : new Date();

    const percentUsed =
        budget.monthly_cap_usd > 0
            ? (budget.spent_usd / budget.monthly_cap_usd) * 100
            : budget.spent_usd > 0
              ? Infinity
              : 0;
    const warningLevel: WarningLevel =
        percentUsed >= 100 ? 'critical' : percentUsed >= BUDGET_WARNING_THRESHOLD * 100 ? 'warning' : 'ok';

    const daysInMonth = daysInMonthUtc(now.getUTCFullYear(), now.getUTCMonth());
    const daysElapsed = Math.max(
        (now.getTime() - Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)) /
            86_400_000,
        1 / 24, // avoid division by ~zero in the first hour of the month
    );
    const projectedSpendUsd = (budget.spent_usd / daysElapsed) * daysInMonth;

    return {
        clubId,
        periodStart: budget.period_start,
        monthlyCapUsd: budget.monthly_cap_usd,
        spentUsd: round6(budget.spent_usd),
        remainingUsd: round6(Math.max(budget.monthly_cap_usd - budget.spent_usd, 0)),
        percentUsed: round6(percentUsed),
        projectedSpendUsd: round6(projectedSpendUsd),
        projectedOverrunUsd: round6(
            Math.max(projectedSpendUsd - budget.monthly_cap_usd, 0),
        ),
        warningLevel,
        disabled: budget.disabled,
    };
}

export interface ClubPlatformSpend {
    clubId: string;
    calls: number;
    costUsd: number;
}

export interface PlatformSpend {
    month: string;
    totalCostUsd: number;
    totalCalls: number;
    clubCount: number;
    /** Top clubs by spend, descending. */
    topClubs: ClubPlatformSpend[];
}

/** Aggregate AI spend across all clubs for one month (platform view). */
export async function getPlatformSpend(
    month: string,
    deps: CostDeps,
): Promise<PlatformSpend> {
    const { since, until } = monthBounds(month);
    const rows: UsageRow[] = await deps.db.listUsage({ since, until });

    const perClub = new Map<string, ClubPlatformSpend>();
    let totalCostUsd = 0;
    let totalCalls = 0;
    for (const row of rows) {
        totalCostUsd += row.cost_usd;
        totalCalls += 1;
        let entry = perClub.get(row.club_id);
        if (!entry) {
            entry = { clubId: row.club_id, calls: 0, costUsd: 0 };
            perClub.set(row.club_id, entry);
        }
        entry.calls += 1;
        entry.costUsd += row.cost_usd;
    }

    return {
        month,
        totalCostUsd: round6(totalCostUsd),
        totalCalls,
        clubCount: perClub.size,
        topClubs: [...perClub.values()]
            .map((c) => ({ ...c, costUsd: round6(c.costUsd) }))
            .sort((a, b) => b.costUsd - a.costUsd),
    };
}

// ---------------------------------------------------------------------------
// Budget alerts
// ---------------------------------------------------------------------------

/** Notification surface the budget alert needs. Kept separate from CostDb. */
export interface AlertNotify {
    /** User ids to notify: club creator + owner/admin members, deduped. */
    findClubOwners(clubId: string): Promise<string[]>;
    /** True when a budget_warning was already sent for this period. */
    hasWarningBeenSent(clubId: string, periodStart: string): Promise<boolean>;
    sendNotification(input: {
        userId: string;
        clubId: string;
        title: string;
        body: string;
        metadata: Record<string, unknown>;
    }): Promise<void>;
}

export interface AlertDeps extends CostDeps {
    notify: AlertNotify;
}

export interface BudgetAlertResult {
    sent: boolean;
    reason: 'below-threshold' | 'already-sent' | 'no-owners' | 'sent';
    notifiedUserIds?: string[];
}

/**
 * When a club reaches >= 80% of its monthly AI budget, notify the creator
 * once per billing period via the existing `notifications` table. Best
 * effort: failures must never break the agent call that triggered the
 * check — the caller wraps this in try/catch.
 */
export async function maybeSendBudgetAlert(
    clubId: string,
    deps: AlertDeps,
): Promise<BudgetAlertResult> {
    const status = await getBudgetStatus(clubId, deps);
    if (status.warningLevel === 'ok' || status.disabled) {
        return { sent: false, reason: 'below-threshold' };
    }
    if (await deps.notify.hasWarningBeenSent(clubId, status.periodStart)) {
        return { sent: false, reason: 'already-sent' };
    }
    const ownerIds = await deps.notify.findClubOwners(clubId);
    if (ownerIds.length === 0) {
        return { sent: false, reason: 'no-owners' };
    }

    const title = `⚠️ Presupuesto de IA al ${Math.round(status.percentUsed)}%`;
    const body =
        `Tu club ha usado $${status.spentUsd.toFixed(2)} de $${status.monthlyCapUsd.toFixed(2)} ` +
        `del presupuesto mensual de IA (${Math.round(status.percentUsed)}%). ` +
        `Al ritmo actual, el mes cerraría en ~$${status.projectedSpendUsd.toFixed(2)}. ` +
        `Los costos de IA están incluidos en el margen de la plataforma.`;

    for (const userId of ownerIds) {
        await deps.notify.sendNotification({
            userId,
            clubId,
            title,
            body,
            metadata: {
                source: 'ai-cost',
                type: 'budget_warning',
                period: status.periodStart,
                percentUsed: status.percentUsed,
            },
        });
    }
    return { sent: true, reason: 'sent', notifiedUserIds: ownerIds };
}

/**
 * Real AlertNotify backed by Supabase (service-role). Throws
 * AI_DB_UNAVAILABLE when env is missing — same contract as supabaseCostDb.
 */
export function supabaseAlertNotify(): AlertNotify {
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
        async findClubOwners(clubId: string): Promise<string[]> {
            const owners = new Set<string>();

            const { data: club, error: clubError } = await supabase
                .from('clubs')
                .select('creator')
                .eq('id', clubId)
                .maybeSingle();
            if (clubError) {
                throw new AIAgentError(
                    'AI_DB_UNAVAILABLE',
                    `Failed to read club creator: ${clubError.message}`,
                );
            }
            if (club?.creator) owners.add(club.creator as string);

            const { data: staff, error: staffError } = await supabase
                .from('users_clubs')
                .select('user_id')
                .eq('club_id', clubId)
                .in('role', ['owner', 'admin']);
            if (staffError) {
                throw new AIAgentError(
                    'AI_DB_UNAVAILABLE',
                    `Failed to read club staff: ${staffError.message}`,
                );
            }
            for (const row of (staff ?? []) as { user_id: string }[]) {
                owners.add(row.user_id);
            }
            return [...owners];
        },

        async hasWarningBeenSent(clubId: string, periodStart: string): Promise<boolean> {
            const { data, error } = await supabase
                .from('notifications')
                .select('id')
                .eq('club_id', clubId)
                .eq('metadata->>type', 'budget_warning')
                .eq('metadata->>period', periodStart)
                .limit(1);
            if (error) {
                throw new AIAgentError(
                    'AI_DB_UNAVAILABLE',
                    `Failed to check budget warnings: ${error.message}`,
                );
            }
            return (data?.length ?? 0) > 0;
        },

        async sendNotification(input: {
            userId: string;
            clubId: string;
            title: string;
            body: string;
            metadata: Record<string, unknown>;
        }): Promise<void> {
            const { error } = await supabase.from('notifications').insert({
                user_id: input.userId,
                type: 'other',
                title: input.title,
                body: input.body,
                club_id: input.clubId,
                icon: '⚠️',
                category: 'engagement',
                metadata: input.metadata,
                read: false,
            });
            if (error) {
                throw new AIAgentError(
                    'AI_DB_UNAVAILABLE',
                    `Failed to send budget warning: ${error.message}`,
                );
            }
        },
    };
}
