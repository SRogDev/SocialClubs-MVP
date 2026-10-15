import {
    checkBudget,
    logUsage,
    type BudgetRow,
    type CostDb,
} from '@/lib/ai/cost';
import type { AIAgentError, CostRecord } from '@/lib/ai/types';

interface FakeDb extends CostDb {
    budgets: Map<string, BudgetRow>;
    usages: unknown[];
    calls: string[];
}

function makeDb(seed?: BudgetRow): FakeDb {
    const budgets = new Map<string, BudgetRow>();
    if (seed) budgets.set(seed.club_id, { ...seed });
    const db: FakeDb = {
        budgets,
        usages: [],
        calls: [],
        async getBudget(clubId) {
            db.calls.push(`getBudget:${clubId}`);
            const row = budgets.get(clubId);
            return row ? { ...row } : null;
        },
        async createBudget(row) {
            db.calls.push(`createBudget:${row.club_id}`);
            budgets.set(row.club_id, { ...row, updated_at: new Date().toISOString() });
        },
        async updateBudget(clubId, patch) {
            db.calls.push(`updateBudget:${clubId}`);
            const row = budgets.get(clubId);
            if (row) budgets.set(clubId, { ...row, ...patch });
        },
        async insertUsage(row) {
            db.calls.push(`insertUsage:${row.club_id}`);
            db.usages.push(row);
        },
        async listUsage(params) {
            db.calls.push(`listUsage:${params.clubId ?? '*'}`);
            return [];
        },
    };
    return db;
}

function budgetRow(overrides: Partial<BudgetRow> = {}): BudgetRow {
    return {
        club_id: 'club-1',
        monthly_cap_usd: 5,
        spent_usd: 0,
        period_start: '2026-10-01',
        disabled: false,
        updated_at: '2026-10-01T00:00:00Z',
        ...overrides,
    };
}

const NOW = () => new Date('2026-10-15T12:00:00Z');

const RECORD: CostRecord = {
    clubId: 'club-1',
    agentId: 'community-manager',
    workflow: 'digest',
    model: 'm',
    promptTokens: 100,
    completionTokens: 50,
    costUsd: 0.001,
    latencyMs: 120,
    mock: false,
};

describe('checkBudget', () => {
    test('throws AI_BUDGET_EXCEEDED when monthly cap is hit', async () => {
        const db = makeDb(budgetRow({ spent_usd: 5, monthly_cap_usd: 5 }));
        const err = await checkBudget('club-1', { db, now: NOW }).catch((e: unknown) => e);
        expect((err as AIAgentError).code).toBe('AI_BUDGET_EXCEEDED');
    });

    test('throws AI_BUDGET_EXCEEDED when spend exceeds the cap', async () => {
        const db = makeDb(budgetRow({ spent_usd: 12, monthly_cap_usd: 5 }));
        await expect(checkBudget('club-1', { db, now: NOW })).rejects.toMatchObject({
            code: 'AI_BUDGET_EXCEEDED',
        });
    });

    test('passes when under the cap', async () => {
        const db = makeDb(budgetRow({ spent_usd: 1.5, monthly_cap_usd: 5 }));
        await expect(checkBudget('club-1', { db, now: NOW })).resolves.toBeUndefined();
    });

    test('auto-creates a budget with the default cap on first use', async () => {
        const db = makeDb();
        await checkBudget('club-1', { db, now: NOW, defaultCapUsd: 5 });

        expect(db.calls).toContain('createBudget:club-1');
        const created = db.budgets.get('club-1');
        expect(created?.monthly_cap_usd).toBe(5);
        expect(created?.spent_usd).toBe(0);
        expect(created?.period_start).toBe('2026-10-01');
    });

    test('resets spent_usd when the period rolled over to a new month', async () => {
        const db = makeDb(budgetRow({ spent_usd: 4.9, period_start: '2026-09-01' }));
        await expect(checkBudget('club-1', { db, now: NOW })).resolves.toBeUndefined();

        expect(db.calls).toContain('updateBudget:club-1');
        const row = db.budgets.get('club-1');
        expect(row?.spent_usd).toBe(0);
        expect(row?.period_start).toBe('2026-10-01');
    });

    test('throws when the club budget is disabled', async () => {
        const db = makeDb(budgetRow({ disabled: true, spent_usd: 0 }));
        await expect(checkBudget('club-1', { db, now: NOW })).rejects.toMatchObject({
            code: 'AI_BUDGET_EXCEEDED',
        });
    });
});

describe('logUsage', () => {
    test('inserts a usage row and increments the budget spend', async () => {
        const db = makeDb(budgetRow({ spent_usd: 1 }));
        await logUsage(RECORD, { db, now: NOW });

        expect(db.calls).toContain('insertUsage:club-1');
        const inserted = db.usages[0] as Record<string, unknown>;
        expect(inserted['club_id']).toBe('club-1');
        expect(inserted['agent_id']).toBe('community-manager');
        expect(inserted['model']).toBe('m');
        expect(inserted['prompt_tokens']).toBe(100);
        expect(inserted['completion_tokens']).toBe(50);
        expect(inserted['cost_usd']).toBe(0.001);
        expect(inserted['mock']).toBe(false);

        expect(db.budgets.get('club-1')?.spent_usd).toBeCloseTo(1.001, 6);
    });

    test('auto-creates the budget row when logging the first call', async () => {
        const db = makeDb();
        await logUsage(RECORD, { db, now: NOW, defaultCapUsd: 5 });

        expect(db.calls).toContain('createBudget:club-1');
        expect(db.usages).toHaveLength(1);
        expect(db.budgets.get('club-1')?.spent_usd).toBeCloseTo(0.001, 6);
    });
});
