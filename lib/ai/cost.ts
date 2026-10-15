/**
 * AI cost control (ADR-001 §3, plan Phases 38/71).
 *
 * - `checkBudget(clubId)`: throws AI_BUDGET_EXCEEDED when the club's monthly
 *   cap is hit. Budgets auto-create on first use with the default cap from
 *   `AI_MONTHLY_BUDGET_USD_DEFAULT` (fallback: 5). Spend resets when the
 *   calendar month rolls over. A disabled budget also blocks.
 * - `logUsage(record)`: persists one row to `ai_usage` and adds the call's
 *   cost to the club's `ai_budgets.spent_usd`.
 *
 * Storage is injected via the `CostDb` interface so unit tests run without a
 * database. `supabaseCostDb()` builds the real adapter from env
 * (service-role key); it throws AI_DB_UNAVAILABLE when the env is missing.
 * Server-side only — never import from client components.
 */
import { createClient } from '@supabase/supabase-js';

import { AIAgentError, type CostRecord } from './types';

export const DEFAULT_MONTHLY_BUDGET_USD = 5;

export interface BudgetRow {
    club_id: string;
    monthly_cap_usd: number;
    spent_usd: number;
    /** First day of the current billing period, YYYY-MM-DD. */
    period_start: string;
    disabled: boolean;
    updated_at: string;
}

export interface NewBudgetRow {
    club_id: string;
    monthly_cap_usd: number;
    spent_usd: number;
    period_start: string;
    disabled: boolean;
}

export interface NewUsageRow {
    club_id: string;
    agent_id: string;
    workflow: string;
    model: string;
    prompt_tokens: number;
    completion_tokens: number;
    cost_usd: number;
    latency_ms: number;
    mock: boolean;
}

/** One persisted usage row read back from `ai_usage` (observability). */
export interface UsageRow extends NewUsageRow {
    created_at: string;
}

/** Filters for reading usage rows. `since`/`until` are ISO timestamps, [since, until). */
export interface UsageListParams {
    clubId?: string;
    since: string;
    until: string;
}

/** Minimal storage surface the cost layer needs. */
export interface CostDb {
    getBudget(clubId: string): Promise<BudgetRow | null>;
    createBudget(row: NewBudgetRow): Promise<void>;
    updateBudget(clubId: string, patch: Partial<BudgetRow>): Promise<void>;
    insertUsage(row: NewUsageRow): Promise<void>;
    /** Usage rows in [since, until), optionally restricted to one club. */
    listUsage(params: UsageListParams): Promise<UsageRow[]>;
}

export interface CostDeps {
    db: CostDb;
    now?: () => Date;
    /** Override for AI_MONTHLY_BUDGET_USD_DEFAULT (used by tests). */
    defaultCapUsd?: number;
}

function monthStart(d: Date): string {
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, '0');
    return `${y}-${m}-01`;
}

function defaultCapUsd(override?: number): number {
    if (override !== undefined) return override;
    const raw = process.env.AI_MONTHLY_BUDGET_USD_DEFAULT;
    const parsed = raw === undefined ? NaN : Number(raw);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_MONTHLY_BUDGET_USD;
}

/** Fetch the budget, creating it with the default cap on first use. */
export async function getOrCreateBudget(clubId: string, deps: CostDeps): Promise<BudgetRow> {
    const now = deps.now ? deps.now() : new Date();
    const existing = await deps.db.getBudget(clubId);
    if (existing) {
        if (existing.period_start < monthStart(now)) {
            const patch: Partial<BudgetRow> = {
                spent_usd: 0,
                period_start: monthStart(now),
                updated_at: now.toISOString(),
            };
            await deps.db.updateBudget(clubId, patch);
            return { ...existing, ...patch };
        }
        return existing;
    }

    const row: NewBudgetRow = {
        club_id: clubId,
        monthly_cap_usd: defaultCapUsd(deps.defaultCapUsd),
        spent_usd: 0,
        period_start: monthStart(now),
        disabled: false,
    };
    await deps.db.createBudget(row);
    return { ...row, updated_at: now.toISOString() };
}

/**
 * Enforce the club's monthly AI budget. Throws AI_BUDGET_EXCEEDED when the
 * cap is reached or the budget is disabled — call BEFORE invoking the model.
 */
export async function checkBudget(clubId: string, deps: CostDeps): Promise<void> {
    const budget = await getOrCreateBudget(clubId, deps);
    if (budget.disabled) {
        throw new AIAgentError(
            'AI_BUDGET_EXCEEDED',
            `AI is disabled for club ${clubId}.`,
        );
    }
    if (budget.spent_usd >= budget.monthly_cap_usd) {
        throw new AIAgentError(
            'AI_BUDGET_EXCEEDED',
            `Club ${clubId} hit its monthly AI budget of $${budget.monthly_cap_usd}.`,
        );
    }
}

/** Persist one usage record and roll its cost into the club's budget spend. */
export async function logUsage(record: CostRecord, deps: CostDeps): Promise<void> {
    const now = deps.now ? deps.now() : new Date();
    await deps.db.insertUsage({
        club_id: record.clubId,
        agent_id: record.agentId,
        workflow: record.workflow,
        model: record.model,
        prompt_tokens: record.promptTokens,
        completion_tokens: record.completionTokens,
        cost_usd: record.costUsd,
        latency_ms: record.latencyMs,
        mock: record.mock,
    });

    const budget = await getOrCreateBudget(record.clubId, deps);
    await deps.db.updateBudget(record.clubId, {
        spent_usd: Math.round((budget.spent_usd + record.costUsd) * 1e6) / 1e6,
        updated_at: now.toISOString(),
    });
}

/**
 * Real CostDb backed by Supabase (service-role). Throws AI_DB_UNAVAILABLE
 * when SUPABASE env vars are missing — the runtime then only proceeds in
 * mock mode, never silently.
 */
export function supabaseCostDb(): CostDb {
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
        async getBudget(clubId: string): Promise<BudgetRow | null> {
            const { data, error } = await supabase
                .from('ai_budgets')
                .select('*')
                .eq('club_id', clubId)
                .maybeSingle();
            if (error) {
                throw new AIAgentError(
                    'AI_DB_UNAVAILABLE',
                    `Failed to read ai_budgets: ${error.message}`,
                );
            }
            return (data as BudgetRow | null) ?? null;
        },
        async createBudget(row: NewBudgetRow): Promise<void> {
            const { error } = await supabase.from('ai_budgets').insert(row);
            if (error) {
                throw new AIAgentError(
                    'AI_DB_UNAVAILABLE',
                    `Failed to create ai_budgets row: ${error.message}`,
                );
            }
        },
        async updateBudget(clubId: string, patch: Partial<BudgetRow>): Promise<void> {
            const { error } = await supabase.from('ai_budgets').update(patch).eq('club_id', clubId);
            if (error) {
                throw new AIAgentError(
                    'AI_DB_UNAVAILABLE',
                    `Failed to update ai_budgets: ${error.message}`,
                );
            }
        },
        async insertUsage(row: NewUsageRow): Promise<void> {
            const { error } = await supabase.from('ai_usage').insert(row);
            if (error) {
                throw new AIAgentError(
                    'AI_DB_UNAVAILABLE',
                    `Failed to insert ai_usage: ${error.message}`,
                );
            }
        },
        async listUsage(params: UsageListParams): Promise<UsageRow[]> {
            let query = supabase
                .from('ai_usage')
                .select('*')
                .gte('created_at', params.since)
                .lt('created_at', params.until)
                .order('created_at', { ascending: true });
            if (params.clubId !== undefined) {
                query = query.eq('club_id', params.clubId);
            }
            const { data, error } = await query;
            if (error) {
                throw new AIAgentError(
                    'AI_DB_UNAVAILABLE',
                    `Failed to read ai_usage: ${error.message}`,
                );
            }
            return (data as UsageRow[]) ?? [];
        },
    };
}
