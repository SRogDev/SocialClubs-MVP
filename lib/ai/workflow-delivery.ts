/**
 * Delivery seam for community-automation workflow actions (Phases 41-45).
 *
 * The action executors in lib/ai/actions.ts must perform REAL side effects
 * (notifications, posts, points) — but they run inside unit tests too, so
 * every collaborator goes through this seam. Production uses the service-role
 * Supabase client; tests inject fakes via `setDeliveryDepsForTests`.
 *
 * Server-side only — never import from client components.
 */
import { createClient } from '@supabase/supabase-js';

import { AIAgentError } from './types';

export interface DeliveryDeps {
    notifyMember(input: {
        userId: string;
        clubId: string;
        title: string;
        body: string;
    }): Promise<void>;
    postToClub(input: {
        clubId: string;
        title: string;
        body: string;
    }): Promise<{ postId: string }>;
    grantIncentivePoints(input: {
        userId: string;
        clubId: string;
        points: number;
        reason: string;
    }): Promise<void>;
}

let testOverride: DeliveryDeps | null = null;

/**
 * Test-only seam. Unit tests call this to replace real delivery with fakes
 * so workflow executors never touch the network. Always reset to null after.
 */
export function setDeliveryDepsForTests(deps: DeliveryDeps | null): void {
    testOverride = deps;
}

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

async function defaultNotifyMember(input: {
    userId: string;
    clubId: string;
    title: string;
    body: string;
}): Promise<void> {
    const supabase = serviceRoleClient();
    const { error } = await supabase.from('notifications').insert({
        user_id: input.userId,
        type: 'other',
        title: input.title,
        body: input.body,
        club_id: input.clubId,
        icon: '🤖',
        category: 'engagement',
        metadata: { source: 'ai-workflow' },
        read: false,
    });
    if (error) throw new Error(`notifyMember failed: ${error.message}`);
}

async function defaultPostToClub(input: {
    clubId: string;
    title: string;
    body: string;
}): Promise<{ postId: string }> {
    const supabase = serviceRoleClient();
    const { data, error } = await supabase
        .from('posts')
        .insert({
            club_id: input.clubId,
            type: 'text',
            content: { text: `**${input.title}**\n\n${input.body}`, source: 'ai-digest' },
        })
        .select('id')
        .single();
    if (error) throw new Error(`postToClub failed: ${error.message}`);
    return { postId: data.id as string };
}

async function defaultGrantIncentivePoints(input: {
    userId: string;
    clubId: string;
    points: number;
    reason: string;
}): Promise<void> {
    // Dynamic import: keeps actions.ts light and avoids any import cycle
    // through the service layer.
    const { awardPoints } = await import('@/services/gamificationService');
    // 'ai_incentive' is the dedicated gamification action for workflow
    // incentives. Clubs configure its point value in their gamification
    // rules; unset/0 means no points are granted (awardPoints no-ops).
    await awardPoints({
        userId: input.userId,
        clubId: input.clubId,
        actionType: 'ai_incentive',
        metadata: { reason: input.reason, points: input.points },
        internalSecret: process.env.INTERNAL_WORKER_SECRET,
    });
}

/** Resolve the active delivery deps (test override wins). */
export function delivery(): DeliveryDeps {
    if (testOverride) return testOverride;
    return {
        notifyMember: defaultNotifyMember,
        postToClub: defaultPostToClub,
        grantIncentivePoints: defaultGrantIncentivePoints,
    };
}
