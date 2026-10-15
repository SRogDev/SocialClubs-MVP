/**
 * Community automation workflows (master plan Phases 41-45).
 *
 * Three workflows that escalate with the club's proactivity level:
 *
 *   welcome      — on member_joined.
 *                    steps: send_welcome (low) + enroll_challenge (medium)
 *   reengagement — on churn risk.
 *                    steps: send_checkin (low) + grant_points (medium)
 *   digest       — weekly.
 *                    steps: post_digest (low) + notify_inactive (medium)
 *
 * Execution model: `runWorkflow(name, ctx, deps)` composes the step inputs
 * (LLM-composed welcome/check-in text, deterministic digest) and runs every
 * step through the governance pipeline's `verifyAndExecute` (lib/ai/verify.ts)
 * — each step is verified individually: schema → agent permissions → club
 * policy → proactivity mode → (AI reviewer for medium+ risk) → execute →
 * audit. The proactivity matrix (lib/ai/proactivity.ts) turns the SAME step
 * list into the level contract with no branching in this file:
 *
 *   L1 (Advisor):    every step lands as a DRAFT in the AI Inbox. Nothing is
 *                    ever auto-sent — no exceptions.
 *   L2 (Operator):   low-risk steps auto-send; medium steps go to the AI
 *                    reviewer and, on escalate, wait for human approval.
 *   L3 (Autonomous): low-risk steps auto-send; medium steps pass the AI
 *                    reviewer and auto-send.
 *
 * Idempotency: every step gets `<runKey>:<action>` as its idempotency key, so
 * the pipeline dedupes redeliveries per step. `runWorkflow` additionally
 * pre-checks all planned step keys before any (costly) input composition:
 * when every step already ran, it replays the recorded outcome without side
 * effects.
 *
 * Server-side only — never import from client components.
 */
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';

import { COMMUNITY_MANAGER } from './agents';
import type { CostDeps } from './cost';
import { invokeAgent, type InvokeDeps } from './runtime';
import { detectChurnRisk } from './relationship';
import { AIAgentError, type AIClient, type AgentDefinition } from './types';
import { verifyAndExecute, type VerifyDb, type VerifyResult } from './verify';

export type WorkflowName = 'welcome' | 'reengagement' | 'digest';

export const WORKFLOW_NAMES: readonly WorkflowName[] = ['welcome', 'reengagement', 'digest'];

/** Context every workflow run needs. memberId is required by welcome/reengagement. */
export interface WorkflowCtx {
    clubId: string;
    memberId?: string;
    /** Mandatory: QStash redeliveries and cron retries dedupe on this key. */
    idempotencyKey: string;
}

export interface WorkflowDeps {
    db: VerifyDb;
    /** Injected model client (tests). Defaults to AIsa-or-mock selection. */
    client?: AIClient;
    /** Injected cost storage (tests). Defaults to the Supabase adapter. */
    cost?: CostDeps;
    now?: () => Date;
    /** Agent definition proposing the steps (tests). Defaults to COMMUNITY_MANAGER. */
    agentDef?: AgentDefinition;
    /** Digest stats source (tests). Defaults to the Supabase adapter. */
    digestStats?: DigestStatsDb;
    /** Inactive-member listing (tests). Defaults to the churn scan. */
    listInactiveIds?: (clubId: string) => Promise<string[]>;
    /** Churn assessment (tests). Defaults to detectChurnRisk. */
    assessChurn?: (clubId: string, userId: string) => Promise<{ atRisk: boolean; reason: string }>;
}

export interface WorkflowStepOutcome {
    action: string;
    result: VerifyResult;
}

export type WorkflowStatus = 'completed' | 'partial' | 'failed';

export interface WorkflowRunResult {
    workflow: WorkflowName;
    clubId: string;
    status: WorkflowStatus;
    steps: WorkflowStepOutcome[];
    /** True when every step had already run — no side effects on this call. */
    idempotentReplay: boolean;
}

// ---------------------------------------------------------------------------
// Step planning (pure)
// ---------------------------------------------------------------------------

export interface PlannedStep {
    action: string;
    inputs: Record<string, unknown>;
}

export interface WelcomeInputs {
    memberId: string;
    welcomeBody: string;
}

export interface ReengagementInputs {
    memberId: string;
    checkinBody: string;
    incentivePoints: number;
}

export interface DigestInputs {
    title: string;
    body: string;
    /** Empty when no inactive members — the notify step is then skipped. */
    inactiveUserIds: string[];
}

/**
 * All action names a workflow can plan (superset — the digest's
 * notify_inactive step is conditional). Used for the idempotency pre-check
 * before any (costly) input composition happens.
 */
export function plannedActions(name: WorkflowName): string[] {
    switch (name) {
        case 'welcome':
            return ['send_welcome', 'enroll_challenge'];
        case 'reengagement':
            return ['send_checkin', 'grant_points'];
        case 'digest':
            return ['post_digest', 'notify_inactive'];
    }
}

/**
 * Build the step list for a workflow. Pure: the SAME steps are planned at
 * every proactivity level — the governance pipeline resolves draft vs
 * auto vs approval per step from the club's level.
 */
export function buildSteps(
    name: WorkflowName,
    inputs: WelcomeInputs | ReengagementInputs | DigestInputs,
): PlannedStep[] {
    switch (name) {
        case 'welcome': {
            const w = inputs as WelcomeInputs;
            return [
                {
                    action: 'send_welcome',
                    inputs: { recipientId: w.memberId, body: w.welcomeBody },
                },
                {
                    action: 'enroll_challenge',
                    inputs: { userId: w.memberId, challenge: 'reto de bienvenida' },
                },
            ];
        }
        case 'reengagement': {
            const r = inputs as ReengagementInputs;
            return [
                {
                    action: 'send_checkin',
                    inputs: { recipientId: r.memberId, body: r.checkinBody },
                },
                {
                    action: 'grant_points',
                    inputs: {
                        userId: r.memberId,
                        points: r.incentivePoints,
                        reason: 'reengagement_incentive',
                    },
                },
            ];
        }
        case 'digest': {
            const d = inputs as DigestInputs;
            const steps: PlannedStep[] = [
                { action: 'post_digest', inputs: { title: d.title, body: d.body } },
            ];
            if (d.inactiveUserIds.length > 0) {
                steps.push({
                    action: 'notify_inactive',
                    inputs: {
                        userIds: d.inactiveUserIds.slice(0, 50),
                        title: d.title,
                        body: d.body.slice(0, 2000),
                    },
                });
            }
            return steps;
        }
    }
}

// ---------------------------------------------------------------------------
// Input composition
// ---------------------------------------------------------------------------

const welcomeComposerDef = () => ({
    ...COMMUNITY_MANAGER,
    mission:
        'Write a warm, concise welcome message for a new club member, in Spanish. ' +
        'Include exactly 3 concrete first steps to get started in the club.',
    policies: [
        ...COMMUNITY_MANAGER.policies,
        'Write in Spanish.',
        'This message may be sent as-is: keep it ready to send, under 1200 characters.',
        'Never promise rewards, events, or features not mentioned in the request context.',
    ],
    outputSchema: z.object({ body: z.string().min(1).max(4000) }),
});

const checkinComposerDef = () => ({
    ...COMMUNITY_MANAGER,
    mission:
        'Write a warm, brief re-engagement nudge for a club member who has been ' +
        'inactive, in Spanish. Acknowledge their absence kindly, mention one ' +
        'reason to come back, and invite them — no guilt-tripping.',
    policies: [
        ...COMMUNITY_MANAGER.policies,
        'Write in Spanish.',
        'This message may be sent as-is: keep it ready to send, under 800 characters.',
        'Never promise rewards, events, or features not mentioned in the request context.',
    ],
    outputSchema: z.object({ body: z.string().min(1).max(4000) }),
});

function invokeDeps(deps: WorkflowDeps): InvokeDeps {
    const out: InvokeDeps = {};
    if (deps.client) out.client = deps.client;
    if (deps.cost) out.cost = deps.cost;
    if (deps.now) out.now = deps.now;
    return out;
}

/** LLM-compose the welcome text (3 starter ideas included). */
export async function composeWelcomeBody(
    clubId: string,
    memberId: string,
    deps: WorkflowDeps,
): Promise<string> {
    const { output } = await invokeAgent<{ body: string }>(
        welcomeComposerDef(),
        {
            type: 'workflow_welcome_compose',
            clubId,
            memberId,
            payload: { task: 'welcome' },
        },
        invokeDeps(deps),
    );
    return output.body;
}

/** LLM-compose the re-engagement check-in text. */
export async function composeCheckinBody(
    clubId: string,
    memberId: string,
    reason: string,
    deps: WorkflowDeps,
): Promise<string> {
    const { output } = await invokeAgent<{ body: string }>(
        checkinComposerDef(),
        {
            type: 'workflow_checkin_compose',
            clubId,
            memberId,
            payload: { task: 'checkin', reason },
        },
        invokeDeps(deps),
    );
    return output.body;
}

/** Minimal stats surface the deterministic digest builder needs. */
export interface DigestStatsDb {
    countPostsSince(clubId: string, sinceIso: string): Promise<number>;
    countNewMembersSince(clubId: string, sinceIso: string): Promise<number>;
}

/**
 * Deterministic weekly digest (no LLM): measured counts only, never invented
 * content. Honest by construction.
 */
export async function buildWeeklyDigest(
    clubId: string,
    db: DigestStatsDb,
    now: Date = new Date(),
): Promise<{ title: string; body: string }> {
    const since = new Date(now.getTime() - 7 * 24 * 3600 * 1000).toISOString();
    let postCount = 0;
    let newMembers = 0;
    try {
        postCount = await db.countPostsSince(clubId, since);
    } catch {
        // best effort — the digest still goes out
    }
    try {
        newMembers = await db.countNewMembersSince(clubId, since);
    } catch {
        // best effort
    }
    const lines = [
        'Esta semana en el club:',
        `• ${postCount} publicaciones nuevas`,
        `• ${newMembers} miembros nuevos`,
        '',
        postCount === 0
            ? 'Poca actividad esta semana — ¡sé tú quien rompa el hielo con un post!'
            : '¡Gracias a todos por mantener viva la conversación!',
    ];
    return { title: 'Resumen semanal del club', body: lines.join('\n') };
}

// ---------------------------------------------------------------------------
// Churn wiring: detectChurnRisk at-risk → enqueue reengagementWorkflow
// ---------------------------------------------------------------------------

export interface ChurnEnqueueDeps {
    assess?: (clubId: string, userId: string) => Promise<{ atRisk: boolean; reason: string }>;
    enqueue?: (job: {
        workflowName: WorkflowName;
        clubId: string;
        memberId?: string;
        idempotencyKey: string;
        triggeredAt: number;
    }) => Promise<void>;
    /** Week label for the idempotency key, e.g. "2026-W42". Defaults to current week. */
    weekKey?: string;
    now?: () => Date;
}

/** ISO week label "YYYY-Www" for idempotency keys. */
export function isoWeekKey(date: Date): string {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const day = (d.getUTCDay() + 6) % 7; // Monday = 0
    d.setUTCDate(d.getUTCDate() - day + 3); // Thursday of this week
    const year = d.getUTCFullYear();
    const firstThursday = new Date(Date.UTC(year, 0, 4));
    const week = 1 + Math.round((d.getTime() - firstThursday.getTime()) / (7 * 86400000));
    return `${year}-W${String(week).padStart(2, '0')}`;
}

async function defaultEnqueueWorkflow(job: {
    workflowName: WorkflowName;
    clubId: string;
    memberId?: string;
    idempotencyKey: string;
    triggeredAt: number;
}): Promise<void> {
    // Dynamic import: lib/qstash throws at import time when QSTASH_TOKEN is
    // unset, and workflows.ts must stay importable in unit tests.
    const { enqueueAIWorkflow } = await import('@/lib/qstash');
    await enqueueAIWorkflow(job);
}

/**
 * Assess churn risk for one member; when at risk, enqueue the reengagement
 * workflow (one enqueue per member per week via the idempotency key).
 */
export async function enqueueReengagementIfAtRisk(
    clubId: string,
    userId: string,
    deps: ChurnEnqueueDeps = {},
): Promise<{ enqueued: boolean; reason: string }> {
    const assess =
        deps.assess ??
        (async (c: string, u: string) => {
            const a = await detectChurnRisk(c, u);
            return { atRisk: a.atRisk, reason: a.reason };
        });
    const assessment = await assess(clubId, userId);
    if (!assessment.atRisk) {
        return { enqueued: false, reason: assessment.reason };
    }
    const weekKey = deps.weekKey ?? isoWeekKey(deps.now?.() ?? new Date());
    const enqueue = deps.enqueue ?? defaultEnqueueWorkflow;
    await enqueue({
        workflowName: 'reengagement',
        clubId,
        memberId: userId,
        idempotencyKey: `reengagement:${clubId}:${userId}:${weekKey}`,
        triggeredAt: Date.now(),
    });
    return { enqueued: true, reason: assessment.reason };
}

// ---------------------------------------------------------------------------
// Workflow runner
// ---------------------------------------------------------------------------

function stepKey(ctx: WorkflowCtx, action: string): string {
    return `${ctx.idempotencyKey}:${action}`;
}

function aggregateStatus(results: VerifyResult[]): WorkflowStatus {
    const failed = results.filter((r) => r.status === 'failed' || r.status === 'blocked').length;
    if (failed === 0) return 'completed';
    return failed === results.length ? 'failed' : 'partial';
}

/** Aggregate recorded ai_actions row statuses into a workflow status. */
function aggregateRowStatus(statuses: string[]): WorkflowStatus {
    const failed = statuses.filter((s) => s === 'failed' || s === 'blocked').length;
    if (failed === 0) return 'completed';
    return failed === statuses.length ? 'failed' : 'partial';
}

function failedResult(action: string, message: string): VerifyResult {
    return { status: 'failed', reason: `[${action}] ${message}` };
}

/**
 * Run a workflow: idempotency pre-check, compose the step inputs, then
 * verify+execute each step through the governance pipeline. The club's
 * proactivity level is enforced per step by the pipeline — this function
 * never branches on level.
 */
export async function runWorkflow(
    name: WorkflowName,
    ctx: WorkflowCtx,
    deps: WorkflowDeps,
): Promise<WorkflowRunResult> {
    if (!(WORKFLOW_NAMES as readonly string[]).includes(name)) {
        throw new Error(
            `Unknown workflow "${name}" — expected one of ${WORKFLOW_NAMES.join(', ')}.`,
        );
    }
    if (!ctx.idempotencyKey || ctx.idempotencyKey.trim().length === 0) {
        throw new Error('runWorkflow requires ctx.idempotencyKey (workflows must be idempotent).');
    }
    if ((name === 'welcome' || name === 'reengagement') && !ctx.memberId) {
        throw new Error(`Workflow "${name}" requires ctx.memberId.`);
    }

    // 1. Idempotency pre-check (before any costly input composition): when
    //    every planned step already ran, replay the recorded outcome.
    const preKeys = plannedActions(name).map((action) => stepKey(ctx, action));
    const preExisting = await Promise.all(preKeys.map((k) => deps.db.findActionByIdempotencyKey(k)));
    if (preExisting.every((row) => row !== null)) {
        return {
            workflow: name,
            clubId: ctx.clubId,
            status: aggregateRowStatus(preExisting.map((r) => (r as { status: string }).status)),
            steps: [],
            idempotentReplay: true,
        };
    }

    // 2. Compose step inputs.
    const assessChurn =
        deps.assessChurn ??
        (async (c: string, u: string) => {
            const a = await detectChurnRisk(c, u);
            return { atRisk: a.atRisk, reason: a.reason };
        });
    let steps: ReturnType<typeof buildSteps>;
    if (name === 'welcome') {
        const memberId = ctx.memberId as string;
        const welcomeBody = await composeWelcomeBody(ctx.clubId, memberId, deps);
        steps = buildSteps(name, { memberId, welcomeBody });
    } else if (name === 'reengagement') {
        const memberId = ctx.memberId as string;
        const assessment = await assessChurn(ctx.clubId, memberId);
        const checkinBody = await composeCheckinBody(ctx.clubId, memberId, assessment.reason, deps);
        steps = buildSteps(name, { memberId, checkinBody, incentivePoints: 10 });
    } else {
        const digest = await buildWeeklyDigest(
            ctx.clubId,
            deps.digestStats ?? supabaseDigestStatsDb(),
            deps.now?.(),
        );
        const listInactiveIds = deps.listInactiveIds ?? findInactiveMemberIds;
        const inactiveUserIds = await listInactiveIds(ctx.clubId);
        steps = buildSteps(name, { ...digest, inactiveUserIds });
    }

    // 3. Verify + execute each step individually. A step failure never aborts
    //    its siblings — outcomes are aggregated at the end. (The per-step
    //    pipeline dedupe remains the final authority for partial runs: a
    //    crash between compose and execute replays finished steps.)
    const agentDef = deps.agentDef ?? COMMUNITY_MANAGER;
    const outcomes: WorkflowStepOutcome[] = [];
    for (const step of steps) {
        let result: VerifyResult;
        try {
            result = await verifyAndExecute({
                agentDef,
                action: step.action,
                inputs: step.inputs,
                ctx: { clubId: ctx.clubId, idempotencyKey: stepKey(ctx, step.action) },
                deps: { db: deps.db, client: deps.client, cost: deps.cost, now: deps.now },
            });
        } catch (err) {
            result = failedResult(step.action, err instanceof Error ? err.message : String(err));
        }
        outcomes.push({ action: step.action, result });
    }

    return {
        workflow: name,
        clubId: ctx.clubId,
        status: aggregateStatus(outcomes.map((o) => o.result)),
        steps: outcomes,
        idempotentReplay: false,
    };
}

// ---------------------------------------------------------------------------
// Supabase-backed helpers (production wiring; tests inject fakes)
// ---------------------------------------------------------------------------

function serviceRoleClient() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !serviceKey) {
        throw new AIAgentError(
            'AI_DB_UNAVAILABLE',
            'Supabase env (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY) is not configured.',
        );
    }
    return createClient(url, serviceKey);
}

/** Production DigestStatsDb over the service-role client. */
export function supabaseDigestStatsDb(): DigestStatsDb {
    const supabase = serviceRoleClient();
    return {
        async countPostsSince(clubId: string, sinceIso: string): Promise<number> {
            const { count, error } = await supabase
                .from('posts')
                .select('id', { count: 'exact', head: true })
                .eq('club_id', clubId)
                .gte('created_at', sinceIso);
            if (error) throw new Error(`countPostsSince: ${error.message}`);
            return count ?? 0;
        },
        async countNewMembersSince(clubId: string, sinceIso: string): Promise<number> {
            const { count, error } = await supabase
                .from('users_clubs')
                .select('user_id', { count: 'exact', head: true })
                .eq('club_id', clubId)
                .gte('created_at', sinceIso);
            if (error) throw new Error(`countNewMembersSince: ${error.message}`);
            return count ?? 0;
        },
    };
}

/**
 * Inactive member ids for the digest's notify step: members whose churn
 * assessment is at-risk (best-effort; empty on any failure — the digest
 * still posts).
 */
export async function findInactiveMemberIds(clubId: string): Promise<string[]> {
    try {
        const supabase = serviceRoleClient();
        const { data: memberships, error } = await supabase
            .from('users_clubs')
            .select('user_id')
            .eq('club_id', clubId)
            .limit(50);
        if (error) return [];
        const ids = (memberships ?? []).map((m) => m.user_id as string);
        const atRisk: string[] = [];
        for (const userId of ids) {
            try {
                const assessment = await detectChurnRisk(clubId, userId);
                if (assessment.atRisk) atRisk.push(userId);
            } catch {
                // one member's failure never blocks the scan
            }
        }
        return atRisk.slice(0, 50);
    } catch {
        return [];
    }
}
