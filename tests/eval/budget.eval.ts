/**
 * Budget-enforcement evals (master plan Phases 67-68).
 *
 * Subject: `invokeAgent` (lib/ai/runtime.ts) + `checkBudget` (lib/ai/cost.ts).
 * Proves the budget is checked BEFORE any model call:
 *
 *   1. exhausted budget → AI_BUDGET_EXCEEDED and ZERO model invocations
 *      (the check must precede the call — otherwise the call would happen);
 *   2. disabled budget → same fail-closed behavior;
 *   3. healthy budget → exactly one model call, and the call is usage-logged;
 *   4. ordering: the budget read happens before the model invocation.
 *
 * Uses the deterministic mock behind a counting wrapper, and an in-memory
 * CostDb from the harness — no database, no provider, no cost.
 */
import { z } from 'zod';

import {
    defineEval,
    makeInMemoryCostDeps,
    withEnv,
    type EvalCase,
} from '../../lib/ai/eval-harness';
import { invokeAgent } from '../../lib/ai/runtime';
import { MockAIClient } from '../../lib/ai/mock-client';
import type {
    AIClientRequest,
    AIClientResponse,
    AgentDefinition,
    AISignal,
} from '../../lib/ai/types';
import { AIAgentError } from '../../lib/ai/types';
import type { BudgetRow } from '../../lib/ai/cost';

const SUITE = 'budget';
const CLUB_ID = 'eval-club-budget';
const FLAGS = { AI_STAFF_ENABLED: '1', AI_COMMUNITY_MANAGER: '1' };

const TEST_DEF: AgentDefinition = {
    id: 'community-manager',
    role: 'Budget Eval Probe',
    mission: 'Probe agent used only by the budget evals.',
    contextSources: [],
    tools: [],
    permissions: [],
    triggers: [],
    policies: [],
    outputSchema: z.object({ ok: z.boolean() }),
    tier: 'fast',
};

const TEST_SIGNAL: AISignal = {
    type: 'budget-eval-probe',
    clubId: CLUB_ID,
    payload: {},
};

/** Mock client that counts invocations and logs call order into `events`. */
class CountingClient extends MockAIClient {
    calls = 0;
    constructor(private readonly events: string[]) {
        super();
    }
    override async chat(req: AIClientRequest): Promise<AIClientResponse> {
        this.calls += 1;
        this.events.push('model:call');
        return super.chat(req);
    }
}

function budgetRow(overrides: Partial<BudgetRow> = {}): BudgetRow {
    return {
        club_id: CLUB_ID,
        monthly_cap_usd: 5,
        spent_usd: 0,
        period_start: '2026-10-01',
        disabled: false,
        updated_at: new Date().toISOString(),
        ...overrides,
    };
}

export const budgetEvals: EvalCase[] = [
    defineEval(SUITE, 'exhausted budget → throw BEFORE any model call', async () => {
        const events: string[] = [];
        const { cost } = makeInMemoryCostDeps([budgetRow({ spent_usd: 5 })], events);
        const client = new CountingClient(events);
        let err: unknown = null;
        try {
            await withEnv(FLAGS, () => invokeAgent(TEST_DEF, TEST_SIGNAL, { client, cost }));
        } catch (e) {
            err = e;
        }
        if (!(err instanceof AIAgentError) || err.code !== 'AI_BUDGET_EXCEEDED') {
            return { pass: false, details: `expected AI_BUDGET_EXCEEDED, got ${err instanceof Error ? `${err.name}: ${err.message}` : String(err)}` };
        }
        if (client.calls !== 0) {
            return { pass: false, details: `model was invoked ${client.calls}x despite exhausted budget` };
        }
        return { pass: true, details: 'AI_BUDGET_EXCEEDED thrown, 0 model calls' };
    }),

    defineEval(SUITE, 'disabled budget → throw BEFORE any model call', async () => {
        const events: string[] = [];
        const { cost } = makeInMemoryCostDeps([budgetRow({ disabled: true })], events);
        const client = new CountingClient(events);
        let err: unknown = null;
        try {
            await withEnv(FLAGS, () => invokeAgent(TEST_DEF, TEST_SIGNAL, { client, cost }));
        } catch (e) {
            err = e;
        }
        if (!(err instanceof AIAgentError) || err.code !== 'AI_BUDGET_EXCEEDED') {
            return { pass: false, details: `expected AI_BUDGET_EXCEEDED, got ${err instanceof Error ? `${err.name}: ${err.message}` : String(err)}` };
        }
        if (client.calls !== 0) {
            return { pass: false, details: `model was invoked ${client.calls}x despite disabled budget` };
        }
        return { pass: true, details: 'AI_BUDGET_EXCEEDED thrown, 0 model calls' };
    }),

    defineEval(SUITE, 'healthy budget → one model call + usage logged', async () => {
        const events: string[] = [];
        const { cost, usageRows } = makeInMemoryCostDeps([budgetRow()], events);
        const client = new CountingClient(events);
        await withEnv(FLAGS, () => invokeAgent(TEST_DEF, TEST_SIGNAL, { client, cost }));
        if (client.calls !== 1) {
            return { pass: false, details: `expected exactly 1 model call, got ${client.calls}` };
        }
        if (!events.includes('usage:insert')) {
            return { pass: false, details: `usage was not logged (events: ${events.join(',')})` };
        }
        if (usageRows.length !== 1 || usageRows[0].club_id !== CLUB_ID) {
            return { pass: false, details: 'usage row missing or misattributed' };
        }
        return { pass: true, details: '1 model call, usage logged to ai_usage stub' };
    }),

    defineEval(SUITE, 'budget check is ordered before the model call', async () => {
        const events: string[] = [];
        const { cost } = makeInMemoryCostDeps([budgetRow()], events);
        const client = new CountingClient(events);
        await withEnv(FLAGS, () => invokeAgent(TEST_DEF, TEST_SIGNAL, { client, cost }));
        const budgetIdx = events.indexOf('budget:get');
        const modelIdx = events.indexOf('model:call');
        if (budgetIdx === -1 || modelIdx === -1) {
            return { pass: false, details: `missing events (got: ${events.join(',')})` };
        }
        if (budgetIdx > modelIdx) {
            return { pass: false, details: `model called BEFORE budget check (events: ${events.join(',')})` };
        }
        return { pass: true, details: `event order: ${events.join(' → ')}` };
    }),
];
