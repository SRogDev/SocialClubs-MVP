/**
 * AI action registry (ADR-002 §1, master plan Phase 58).
 *
 * The registry is the ONLY way an AI staff agent can act: agents propose
 * structured actions, the verification pipeline (verify.ts) validates and
 * executes them. Adding a new AI capability = adding an ActionDef here +
 * a policy row + tests. No ad-hoc agent powers.
 *
 * v1 action risk assignments:
 * - low:      tag_post, notify_creator, escalate_to_human (reversible, no member-facing side effect)
 *             + workflow actions send_welcome, send_checkin, post_digest (single-member or
 *               deterministic content, fully reversible)
 * - medium:   send_message, create_post, comment_post, hide_post, create_event (member-facing writes)
 *             + workflow actions notify_inactive, grant_points, enroll_challenge
 * - high:     grant_temporary_access, pause_agent (membership/operations changes)
 * - critical: reserved for membership/payment changes — deliberately NOT in v1.
 *
 * Executors: v1 executors are thin STUBS (validate + log, honestly marked)
 * EXCEPT `escalate_to_human` and `notify_creator`, which genuinely persist
 * to `ai_actions`. Real side-effect executors (send_message, create_post,
 * ...) arrive with their features.
 */
import { z } from 'zod';

import { AIAgentError } from './types';
import type { VerifyDb } from './verify';
import { delivery } from './workflow-delivery';

export type ActionRisk = 'low' | 'medium' | 'high' | 'critical';

/** What an executor may do: validate, log, and (for real executors) persist. */
export interface ActionContext {
    clubId: string;
    agentId: string;
    action: string;
    idempotencyKey: string;
    db: VerifyDb;
    now: () => Date;
    /** Policy evaluation that authorized this execution (if any). */
    policyResult?: unknown;
    /** AI review outcome (if any). */
    reviewResult?: unknown;
    /**
     * Id of the pipeline-created `ai_actions` row when one was pre-inserted
     * (always the case when a review ran). A self-auditing executor updates
     * this row instead of inserting a duplicate.
     */
    auditRowId?: string;
}

export interface ActionResult {
    ok: boolean;
    data?: unknown;
    /** True when the executor is an honest stub with no real side effect. */
    stub?: boolean;
    note?: string;
    /**
     * Set when the executor wrote its own `ai_actions` audit row
     * (self-auditing actions); the pipeline then updates that row instead
     * of inserting a duplicate.
     */
    auditRowId?: string;
}

export interface ActionDef {
    name: string;
    description: string;
    risk: ActionRisk;
    /** Permission strings the proposing agent must hold (checked in verify.ts). */
    permissions: string[];
    inputSchema: z.ZodType<unknown>;
    outputSchema: z.ZodType<unknown>;
    /** Safe to deduplicate by idempotency key. */
    idempotent: boolean;
    /** Whether the action requires an audit row (always true for medium+). */
    audit: boolean;
    /** True when the executor persists its own `ai_actions` row. */
    selfAuditing?: boolean;
    execute: (inputs: unknown, ctx: ActionContext) => Promise<ActionResult>;
}

/** Shared executor-result contract: every executor returns at least { ok }. */
const actionResultSchema = z.object({ ok: z.boolean() }).catchall(z.unknown());

const nonEmpty = (max: number) => z.string().min(1).max(max);
const idField = z.string().min(1);

const sendMessageDef: ActionDef = {
    name: 'send_message',
    description: 'Send a message to a club member on behalf of the club.',
    risk: 'medium',
    permissions: ['send_message'],
    inputSchema: z.object({
        recipientId: idField,
        body: nonEmpty(4000),
        channel: z.enum(['dm', 'announcement']).optional(),
    }),
    outputSchema: actionResultSchema,
    idempotent: true,
    audit: true,
    execute: stubExecutor(
        'send_message',
        'real delivery arrives with the messaging feature; no message is sent in v1',
    ),
};

const createPostDef: ActionDef = {
    name: 'create_post',
    description: 'Create a post in the club feed as the AI staff agent.',
    risk: 'medium',
    permissions: ['create_post'],
    inputSchema: z.object({
        title: z.string().max(200).optional(),
        body: nonEmpty(10000),
    }),
    outputSchema: actionResultSchema,
    idempotent: true,
    audit: true,
    execute: stubExecutor(
        'create_post',
        'real post creation arrives with the content feature; nothing is published in v1',
    ),
};

const commentPostDef: ActionDef = {
    name: 'comment_post',
    description: 'Comment on a club post as the AI staff agent.',
    risk: 'medium',
    permissions: ['comment_post'],
    inputSchema: z.object({
        postId: idField,
        body: nonEmpty(2000),
    }),
    outputSchema: actionResultSchema,
    idempotent: true,
    audit: true,
    execute: stubExecutor(
        'comment_post',
        'real commenting arrives with the content feature; nothing is published in v1',
    ),
};

const tagPostDef: ActionDef = {
    name: 'tag_post',
    description: 'Apply an organizational tag to a club post.',
    risk: 'low',
    permissions: ['tag_post'],
    inputSchema: z.object({
        postId: idField,
        tag: nonEmpty(60),
    }),
    outputSchema: actionResultSchema,
    idempotent: true,
    audit: true,
    execute: stubExecutor(
        'tag_post',
        'real tagging arrives with the content feature; nothing is tagged in v1',
    ),
};

const hidePostDef: ActionDef = {
    name: 'hide_post',
    description: 'Hide a club post from the feed (moderation).',
    risk: 'medium',
    permissions: ['hide_post'],
    inputSchema: z.object({
        postId: idField,
        reason: nonEmpty(500),
    }),
    outputSchema: actionResultSchema,
    idempotent: true,
    audit: true,
    execute: stubExecutor(
        'hide_post',
        'real hiding arrives with the moderation feature; nothing is hidden in v1',
    ),
};

const notifyCreatorDef: ActionDef = {
    name: 'notify_creator',
    description: 'Deliver a briefing/notification to the club creator.',
    risk: 'low',
    permissions: ['notify_creator'],
    inputSchema: z.object({
        creatorId: idField,
        title: nonEmpty(200),
        body: nonEmpty(4000),
    }),
    outputSchema: actionResultSchema,
    idempotent: true,
    audit: true,
    selfAuditing: true,
    execute: async (inputs, ctx) => {
        const parsed = notifyCreatorDef.inputSchema.parse(inputs);
        const base = {
            clubId: ctx.clubId,
            agentId: ctx.agentId,
            action: 'notify_creator',
            inputs: parsed,
            idempotencyKey: ctx.idempotencyKey,
            status: 'running',
            policyResult: ctx.policyResult,
            reviewResult: ctx.reviewResult,
        };
        // Real write: this executor genuinely persists to `ai_actions`.
        // When the pipeline pre-inserted the audit row (a review ran), update
        // it instead of inserting a duplicate.
        const row = ctx.auditRowId
            ? ((await ctx.db.updateAction(ctx.auditRowId, base), { id: ctx.auditRowId }))
            : await ctx.db.insertAction(base);
        // v1 honesty note: the audit row IS the durable record; push/email
        // delivery channels arrive with the notification feature.
        return {
            ok: true,
            auditRowId: row.id,
            data: { notified: true, creatorId: (parsed as { creatorId: string }).creatorId },
            note: 'notification recorded in ai_actions; delivery channels arrive with the notification feature',
        };
    },
};

const createEventDef: ActionDef = {
    name: 'create_event',
    description: 'Create a club event.',
    risk: 'medium',
    permissions: ['create_event'],
    inputSchema: z.object({
        title: nonEmpty(200),
        startsAt: z.string().min(1),
        description: z.string().max(2000).optional(),
    }),
    outputSchema: actionResultSchema,
    idempotent: true,
    audit: true,
    execute: stubExecutor(
        'create_event',
        'real event creation arrives with the experiences feature; nothing is created in v1',
    ),
};

const grantTemporaryAccessDef: ActionDef = {
    name: 'grant_temporary_access',
    description: 'Grant a member temporary access to a club resource.',
    risk: 'high',
    permissions: ['grant_temporary_access'],
    inputSchema: z.object({
        memberId: idField,
        resource: nonEmpty(200),
        expiresAt: z.string().min(1),
        reason: nonEmpty(500),
    }),
    outputSchema: actionResultSchema,
    idempotent: true,
    audit: true,
    execute: stubExecutor(
        'grant_temporary_access',
        'real access grants arrive with the access feature; nothing is granted in v1',
    ),
};

const escalateToHumanDef: ActionDef = {
    name: 'escalate_to_human',
    description: 'Escalate a situation to a human (creator/moderator) with context.',
    risk: 'low',
    permissions: ['escalate_to_human'],
    inputSchema: z.object({
        reason: nonEmpty(1000),
        context: z.record(z.string(), z.unknown()).optional(),
    }),
    outputSchema: actionResultSchema,
    idempotent: true,
    audit: true,
    selfAuditing: true,
    execute: async (inputs, ctx) => {
        const parsed = escalateToHumanDef.inputSchema.parse(inputs);
        const base = {
            clubId: ctx.clubId,
            agentId: ctx.agentId,
            action: 'escalate_to_human',
            inputs: parsed,
            idempotencyKey: ctx.idempotencyKey,
            status: 'running',
            policyResult: ctx.policyResult,
            reviewResult: ctx.reviewResult,
        };
        // Real write: this executor genuinely persists to `ai_actions`.
        const row = ctx.auditRowId
            ? ((await ctx.db.updateAction(ctx.auditRowId, base), { id: ctx.auditRowId }))
            : await ctx.db.insertAction(base);
        return {
            ok: true,
            auditRowId: row.id,
            data: { escalated: true, reason: (parsed as { reason: string }).reason },
            note: 'escalation recorded in ai_actions; surfaced in the AI Inbox',
        };
    },
};

const pauseAgentDef: ActionDef = {
    name: 'pause_agent',
    description: 'Pause an AI staff agent for a club.',
    risk: 'high',
    permissions: ['pause_agent'],
    inputSchema: z.object({
        agentId: idField,
        reason: nonEmpty(500),
    }),
    outputSchema: actionResultSchema,
    idempotent: true,
    audit: true,
    execute: stubExecutor(
        'pause_agent',
        'real pausing arrives with the agent-ops feature; nothing is paused in v1',
    ),
};


// ---------------------------------------------------------------------------
// Community automation workflow actions (master plan Phases 41-45).
//
// These are the steps of lib/ai/workflows.ts. Unlike the generic
// send_message/create_post (medium risk), each workflow action is scoped to
// one templated, single-purpose behavior, so its risk rating is honest:
// low  = one member, templated content, fully reversible (welcome, check-in,
//        deterministic weekly digest);
// medium = multi-member reach or value transfer (mass notify, points,
//          challenge enrollment).
// With the proactivity matrix this yields the workflow contract:
//   L1: everything drafts (AI Inbox) — never auto-sends;
//   L2: low-risk steps auto-send, medium steps wait for approval;
//   L3: low+medium steps auto-send.
// Executors are REAL (notifications / posts / points via the delivery seam
// in workflow-delivery.ts) — no stubs.
// ---------------------------------------------------------------------------

const sendWelcomeDef: ActionDef = {
    name: 'send_welcome',
    description: 'Send the onboarding welcome message to a new club member.',
    risk: 'low',
    permissions: ['send_welcome'],
    inputSchema: z.object({
        recipientId: idField,
        title: z.string().max(200).optional(),
        body: nonEmpty(4000),
    }),
    outputSchema: actionResultSchema,
    idempotent: true,
    audit: true,
    execute: async (inputs, ctx) => {
        const parsed = sendWelcomeDef.inputSchema.parse(inputs) as {
            recipientId: string;
            title?: string;
            body: string;
        };
        await delivery().notifyMember({
            userId: parsed.recipientId,
            clubId: ctx.clubId,
            title: parsed.title ?? '¡Bienvenido/a al club!',
            body: parsed.body,
        });
        return { ok: true, data: { delivered: true, recipientId: parsed.recipientId } };
    },
};

const sendCheckinDef: ActionDef = {
    name: 'send_checkin',
    description: 'Send a re-engagement nudge to an inactive club member.',
    risk: 'low',
    permissions: ['send_checkin'],
    inputSchema: z.object({
        recipientId: idField,
        title: z.string().max(200).optional(),
        body: nonEmpty(4000),
    }),
    outputSchema: actionResultSchema,
    idempotent: true,
    audit: true,
    execute: async (inputs, ctx) => {
        const parsed = sendCheckinDef.inputSchema.parse(inputs) as {
            recipientId: string;
            title?: string;
            body: string;
        };
        await delivery().notifyMember({
            userId: parsed.recipientId,
            clubId: ctx.clubId,
            title: parsed.title ?? 'Te extrañamos en el club',
            body: parsed.body,
        });
        return { ok: true, data: { delivered: true, recipientId: parsed.recipientId } };
    },
};

const postDigestDef: ActionDef = {
    name: 'post_digest',
    description: 'Publish the deterministic weekly digest to the club feed.',
    risk: 'low',
    permissions: ['post_digest'],
    inputSchema: z.object({
        title: z.string().max(200).optional(),
        body: nonEmpty(10000),
    }),
    outputSchema: actionResultSchema,
    idempotent: true,
    audit: true,
    execute: async (inputs, ctx) => {
        const parsed = postDigestDef.inputSchema.parse(inputs) as {
            title?: string;
            body: string;
        };
        const { postId } = await delivery().postToClub({
            clubId: ctx.clubId,
            title: parsed.title ?? 'Resumen semanal del club',
            body: parsed.body,
        });
        return { ok: true, data: { postId } };
    },
};

const notifyInactiveDef: ActionDef = {
    name: 'notify_inactive',
    description: 'Notify inactive members about the weekly digest (L3 only auto-sends).',
    risk: 'medium',
    permissions: ['notify_inactive'],
    inputSchema: z.object({
        userIds: z.array(idField).min(1).max(50),
        title: z.string().max(200).optional(),
        body: nonEmpty(4000),
    }),
    outputSchema: actionResultSchema,
    idempotent: true,
    audit: true,
    execute: async (inputs, ctx) => {
        const parsed = notifyInactiveDef.inputSchema.parse(inputs) as {
            userIds: string[];
            title?: string;
            body: string;
        };
        const title = parsed.title ?? 'Novedades de tu club esta semana';
        for (const userId of parsed.userIds) {
            await delivery().notifyMember({ userId, clubId: ctx.clubId, title, body: parsed.body });
        }
        return { ok: true, data: { notified: parsed.userIds.length } };
    },
};

const grantPointsDef: ActionDef = {
    name: 'grant_points',
    description: 'Grant incentive points to a member (re-engagement reward).',
    risk: 'medium',
    permissions: ['grant_points'],
    inputSchema: z.object({
        userId: idField,
        points: z.number().int().min(1).max(100),
        reason: nonEmpty(200),
    }),
    outputSchema: actionResultSchema,
    idempotent: true,
    audit: true,
    execute: async (inputs, ctx) => {
        const parsed = grantPointsDef.inputSchema.parse(inputs) as {
            userId: string;
            points: number;
            reason: string;
        };
        await delivery().grantIncentivePoints({
            userId: parsed.userId,
            clubId: ctx.clubId,
            points: parsed.points,
            reason: parsed.reason,
        });
        return { ok: true, data: { userId: parsed.userId, points: parsed.points } };
    },
};

const enrollChallengeDef: ActionDef = {
    name: 'enroll_challenge',
    description:
        'Enroll a new member in the onboarding challenge. v1 records the ' +
        'enrollment (audit row + member notification); challenge progress ' +
        'tracking arrives with the challenge feature.',
    risk: 'medium',
    permissions: ['enroll_challenge'],
    inputSchema: z.object({
        userId: idField,
        challenge: nonEmpty(120),
    }),
    outputSchema: actionResultSchema,
    idempotent: true,
    audit: true,
    execute: async (inputs, ctx) => {
        const parsed = enrollChallengeDef.inputSchema.parse(inputs) as {
            userId: string;
            challenge: string;
        };
        await delivery().notifyMember({
            userId: parsed.userId,
            clubId: ctx.clubId,
            title: 'Te inscribimos en el reto de bienvenida',
            body:
                `¡Empecemos! Te inscribimos en el ${parsed.challenge}: ` +
                '1) preséntate en el club, 2) reacciona a 3 posts, 3) publica tu primera idea. ' +
                'Completa los 3 pasos y gana puntos extra.',
        });
        return {
            ok: true,
            data: { enrolled: true, userId: parsed.userId, challenge: parsed.challenge },
            note: 'enrollment recorded in ai_actions; challenge progress tracking arrives with the challenge feature',
        };
    },
};

export const ACTION_REGISTRY: Record<string, ActionDef> = {
    send_message: sendMessageDef,
    create_post: createPostDef,
    comment_post: commentPostDef,
    tag_post: tagPostDef,
    hide_post: hidePostDef,
    notify_creator: notifyCreatorDef,
    create_event: createEventDef,
    grant_temporary_access: grantTemporaryAccessDef,
    escalate_to_human: escalateToHumanDef,
    pause_agent: pauseAgentDef,
    // Community automation workflows (master plan Phases 41-45). Risk is
    // calibrated per action so the proactivity matrix (proactivity.ts)
    // produces the workflow contract: L1 drafts everything; L2 auto-sends
    // low-risk steps; L3 auto-sends low+medium steps.
    send_welcome: sendWelcomeDef,
    send_checkin: sendCheckinDef,
    post_digest: postDigestDef,
    notify_inactive: notifyInactiveDef,
    grant_points: grantPointsDef,
    enroll_challenge: enrollChallengeDef,
};

/** Look up an action definition. Throws on unknown names (deny by default). */
export function getAction(name: string): ActionDef {
    const def = ACTION_REGISTRY[name];
    if (!def) {
        throw new AIAgentError(
            'AI_UNKNOWN_ACTION',
            `Unknown AI action "${name}". Actions must be registered in ACTION_REGISTRY (ADR-002 §1).`,
        );
    }
    return def;
}

/** Honest v1 stub: validates (via schema, done by the pipeline) and logs. */
function stubExecutor(
    action: string,
    note: string,
): (inputs: unknown, ctx: ActionContext) => Promise<ActionResult> {
    return async (inputs) => {
        console.info(`[ai-actions][STUB] ${action} validated; not executed: ${note}`);
        return { ok: true, stub: true, note, data: { inputs } };
    };
}
