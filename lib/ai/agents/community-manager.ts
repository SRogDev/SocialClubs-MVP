/**
 * Community Manager v0 capabilities (master plan Phases 4, 5, 6, 7, 10, 16, 20, 21).
 *
 * The first visible AI staff member. The agent definition itself lives in
 * ../agents.ts (COMMUNITY_MANAGER, proactivity L1 = Advisor: draft-only).
 * This module adds the v0 capability functions on top of it:
 *
 * - answerFAQ(question, clubId, deps): drafts an answer GROUNDED in the
 *   club's FAQ (`club_ai_config.policies.faq`, array of {q, a}). No FAQ
 *   configured -> { answer: null, reason: 'no_faq_configured' } WITHOUT
 *   calling the model. The FAQ entries are handed to the model in the
 *   request payload, and the system prompt forbids answering from anything
 *   else (anti-hallucination): uncovered questions must get "No lo sé".
 * - draftOnboarding(input, deps): personalized welcome draft (member name,
 *   club name, 3 first steps) -> verifyAndExecute(send_message). At L1 the
 *   pipeline stores the draft for the AI Inbox and NEVER sends.
 * - draftSignalResponse(signal, deps): new_post -> comment_post draft on
 *   the post; member_joined -> onboarding send_message draft. Unknown
 *   signal types are rejected.
 *
 * Server-side only (imports verify.ts, which uses node:crypto): call it
 * from API routes and the signal worker, never from client components.
 */
import { z } from 'zod';

import { COMMUNITY_MANAGER } from '../agents';
import type { CostDeps } from '../cost';
import { invokeAgent, type InvokeDeps } from '../runtime';
import type { AIClient, AgentDefinition } from '../types';
import { verifyAndExecute, type VerifyDb, type VerifyResult } from '../verify';

/** Deps: one storage adapter covers config reads + the audit trail. */
export interface CommunityManagerDeps {
    db: VerifyDb;
    /** Injected model client (tests). Defaults to AIsa-or-mock selection. */
    client?: AIClient;
    /** Injected cost storage (tests). Defaults to the Supabase adapter. */
    cost?: CostDeps;
    now?: () => Date;
}

function invokeDeps(deps: CommunityManagerDeps): InvokeDeps {
    const out: InvokeDeps = {};
    if (deps.client) out.client = deps.client;
    if (deps.cost) out.cost = deps.cost;
    if (deps.now) out.now = deps.now;
    return out;
}

function verifyDeps(deps: CommunityManagerDeps): {
    db: VerifyDb;
    client?: AIClient;
    cost?: CostDeps;
    now?: () => Date;
} {
    return { db: deps.db, client: deps.client, cost: deps.cost, now: deps.now };
}

function firstStringField(
    payload: Record<string, unknown>,
    ...keys: string[]
): string | undefined {
    for (const key of keys) {
        const value = payload[key];
        if (typeof value === 'string' && value.length > 0) return value;
    }
    return undefined;
}

// ---------------------------------------------------------------------------
// answerFAQ
// ---------------------------------------------------------------------------

const FaqEntrySchema = z.object({ q: z.string(), a: z.string() });
export type FaqEntry = z.infer<typeof FaqEntrySchema>;

const FaqAnswerSchema = z.object({
    answer: z.string(),
    grounded: z.boolean(),
    confidence: z.number().min(0).max(1),
});

export interface FaqResult {
    answer: string | null;
    grounded: boolean;
    confidence: number;
    reason?: string;
}

/** Agent definition specialized for FAQ answering: grounding is a hard rule. */
function faqAgentDef(): AgentDefinition {
    return {
        ...COMMUNITY_MANAGER,
        mission:
            'Answer a club member question using ONLY the club FAQ entries provided in the request.',
        policies: [
            ...COMMUNITY_MANAGER.policies,
            'Answer ONLY from the FAQ entries provided in this request. Never invent facts, prices, dates, names, or policies.',
            'If the FAQ does not cover the question, answer exactly "No lo sé", set grounded=false and confidence below 0.3.',
            'Quote or closely paraphrase the matching FAQ entry; add nothing the FAQ does not say.',
            'Write in Spanish.',
        ],
        outputSchema: FaqAnswerSchema,
    };
}

/**
 * Draft an FAQ answer grounded in `club_ai_config.policies.faq`.
 * Returns { answer: null, reason: 'no_faq_configured' } when the club has
 * no usable FAQ — without spending an LLM call.
 */
export async function answerFAQ(
    question: string,
    clubId: string,
    deps: CommunityManagerDeps,
): Promise<FaqResult> {
    const config = await deps.db.getClubAIConfig(clubId);
    const parsed = z.array(FaqEntrySchema).safeParse(config?.policies?.faq);
    if (!parsed.success || parsed.data.length === 0) {
        return { answer: null, grounded: false, confidence: 0, reason: 'no_faq_configured' };
    }

    const { output } = await invokeAgent<z.infer<typeof FaqAnswerSchema>>(
        faqAgentDef(),
        {
            type: 'faq_answer',
            clubId,
            payload: { question, faq: parsed.data },
        },
        invokeDeps(deps),
    );
    return { answer: output.answer, grounded: output.grounded, confidence: output.confidence };
}

// ---------------------------------------------------------------------------
// draftOnboarding
// ---------------------------------------------------------------------------

const OnboardingDraftSchema = z.object({
    body: z.string().min(1).max(4000),
});

export interface OnboardingInput {
    userId: string;
    clubId: string;
    memberName?: string;
    clubName?: string;
    idempotencyKey?: string;
}

function onboardingAgentDef(): AgentDefinition {
    return {
        ...COMMUNITY_MANAGER,
        mission:
            'Write a warm, concise welcome message for a new club member. ' +
            'Personalize it with the member name and club name when provided, ' +
            'and include exactly 3 concrete first steps to get started.',
        policies: [
            ...COMMUNITY_MANAGER.policies,
            'Write in Spanish.',
            'This message is a DRAFT for the creator to review: keep it ready to send as-is.',
            'Never promise rewards, events, or features not mentioned in the request context.',
        ],
        outputSchema: OnboardingDraftSchema,
    };
}

/**
 * Generate a personalized welcome draft and run it through the governance
 * pipeline as a `send_message` action. At proactivity L1 the pipeline
 * stores the draft (ai_actions, status 'draft') for the AI Inbox — the
 * message is NEVER sent automatically.
 */
export async function draftOnboarding(
    input: OnboardingInput,
    deps: CommunityManagerDeps,
): Promise<VerifyResult> {
    const { output } = await invokeAgent<z.infer<typeof OnboardingDraftSchema>>(
        onboardingAgentDef(),
        {
            type: 'member_onboarding',
            clubId: input.clubId,
            memberId: input.userId,
            payload: {
                memberName: input.memberName ?? null,
                clubName: input.clubName ?? null,
            },
        },
        invokeDeps(deps),
    );

    return verifyAndExecute({
        agentDef: COMMUNITY_MANAGER,
        action: 'send_message',
        inputs: { recipientId: input.userId, channel: 'dm', body: output.body },
        ctx: {
            clubId: input.clubId,
            idempotencyKey:
                input.idempotencyKey ?? `ai:onboarding:${input.clubId}:${input.userId}`,
        },
        deps: verifyDeps(deps),
    });
}

// ---------------------------------------------------------------------------
// draftSignalResponse
// ---------------------------------------------------------------------------

const CommentDraftSchema = z.object({
    body: z.string().min(1).max(2000),
});

/** Minimal signal shape this module needs (AISignalRecord-compatible). */
export interface CommunityManagerSignal {
    type: string;
    clubId: string;
    payload: Record<string, unknown>;
    idempotencyKey?: string;
}

function commentAgentDef(): AgentDefinition {
    return {
        ...COMMUNITY_MANAGER,
        mission:
            'Write a short, warm comment on a new club post that keeps the ' +
            'conversation going and makes the author feel welcome.',
        policies: [
            ...COMMUNITY_MANAGER.policies,
            'Write in Spanish.',
            'React to the actual post content when an excerpt is provided; otherwise keep it generic and warm.',
            'This comment is a DRAFT for the creator to review: keep it ready to post as-is.',
            'Never invent facts about the post, the author, or the club.',
        ],
        outputSchema: CommentDraftSchema,
    };
}

/**
 * Draft a contextual response for a product signal:
 * - new_post      -> comment_post draft on the post
 * - member_joined -> onboarding send_message draft (see draftOnboarding)
 * Anything else is rejected (deny by default).
 */
export async function draftSignalResponse(
    signal: CommunityManagerSignal,
    deps: CommunityManagerDeps,
): Promise<VerifyResult> {
    if (signal.type === 'new_post') {
        const postId = firstStringField(signal.payload, 'postId');
        if (!postId) {
            return { status: 'rejected', reason: 'new_post signal has no postId in payload' };
        }
        const { output } = await invokeAgent<z.infer<typeof CommentDraftSchema>>(
            commentAgentDef(),
            {
                type: 'signal_response',
                clubId: signal.clubId,
                payload: {
                    postId,
                    authorId: firstStringField(signal.payload, 'authorId', 'userId') ?? null,
                    postTitle: firstStringField(signal.payload, 'postTitle', 'title') ?? null,
                    postExcerpt:
                        firstStringField(signal.payload, 'postExcerpt', 'excerpt') ?? null,
                },
            },
            invokeDeps(deps),
        );
        return verifyAndExecute({
            agentDef: COMMUNITY_MANAGER,
            action: 'comment_post',
            inputs: { postId, body: output.body },
            ctx: {
                clubId: signal.clubId,
                idempotencyKey:
                    signal.idempotencyKey ?? `ai:signal-comment:${signal.clubId}:${postId}`,
            },
            deps: verifyDeps(deps),
        });
    }

    if (signal.type === 'member_joined') {
        const userId = firstStringField(signal.payload, 'userId', 'memberId');
        if (!userId) {
            return { status: 'rejected', reason: 'member_joined signal has no userId in payload' };
        }
        return draftOnboarding(
            {
                userId,
                clubId: signal.clubId,
                memberName: firstStringField(signal.payload, 'userName', 'memberName'),
                clubName: firstStringField(signal.payload, 'clubName'),
                idempotencyKey: signal.idempotencyKey,
            },
            deps,
        );
    }

    return {
        status: 'rejected',
        reason: `unsupported signal type "${signal.type}" for community-manager v0`,
    };
}
