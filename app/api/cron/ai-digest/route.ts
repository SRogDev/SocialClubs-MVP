/**
 * GET /api/cron/ai-digest
 *
 * Weekly community-automation cron (Vercel Cron, configured in vercel.json —
 * Mondays 09:00). For every club (capped):
 *   1. Enqueues the `digest` workflow — the club's proactivity level decides
 *      draft-only (L1) vs auto-post (L2) vs auto-post + notify inactive (L3),
 *      enforced per step by the governance pipeline.
 *   2. Churn scan — for members flagged at-risk by detectChurnRisk, enqueues
 *      the `reengagement` workflow (one enqueue per member per week).
 *
 * Both enqueues are fire-and-forget QStash jobs; per-step idempotency keys
 * make the whole cron safe to retry.
 *
 * Called by Vercel Cron (configured in vercel.json).
 */
import { createClient } from '@supabase/supabase-js';
import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';

import { enqueueAIWorkflow } from '@/lib/qstash';
import { enqueueReengagementIfAtRisk, isoWeekKey } from '@/lib/ai/workflows';

const MAX_CLUBS = 100;
const MAX_MEMBERS_PER_CLUB = 50;

function serviceRoleClient() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !serviceKey) {
        throw new Error('Supabase service-role env is not configured');
    }
    return createClient(url, serviceKey);
}

export async function GET(request: NextRequest) {
    try {
        // Verify cron secret for security (same pattern as check-appointments)
        const authHeader = request.headers.get('authorization');
        const cronSecret = process.env.CRON_SECRET;

        if (!cronSecret) {
            console.error('[CRON ai-digest] CRON_SECRET not configured');
            return NextResponse.json({ error: 'Cron secret not configured' }, { status: 500 });
        }

        if (authHeader !== `Bearer ${cronSecret}`) {
            console.error('[CRON ai-digest] Invalid cron authorization');
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const weekKey = isoWeekKey(new Date());
        const results = {
            clubs: 0,
            digestsEnqueued: 0,
            reengagementsEnqueued: 0,
            errors: [] as string[],
        };

        const supabase = serviceRoleClient();

        const { data: clubs, error: clubsError } = await supabase
            .from('clubs')
            .select('id')
            .limit(MAX_CLUBS);
        if (clubsError) throw new Error(`list clubs: ${clubsError.message}`);

        for (const club of clubs ?? []) {
            const clubId = club.id as string;
            results.clubs += 1;

            // 1. Weekly digest workflow
            try {
                await enqueueAIWorkflow({
                    workflowName: 'digest',
                    clubId,
                    idempotencyKey: `digest:${clubId}:${weekKey}`,
                    triggeredAt: Date.now(),
                });
                results.digestsEnqueued += 1;
            } catch (err) {
                results.errors.push(
                    `digest ${clubId}: ${err instanceof Error ? err.message : String(err)}`,
                );
            }

            // 2. Churn scan — enqueue reengagement only for at-risk members
            try {
                const { data: memberships, error: membersError } = await supabase
                    .from('users_clubs')
                    .select('user_id')
                    .eq('club_id', clubId)
                    .limit(MAX_MEMBERS_PER_CLUB);
                if (membersError) throw new Error(`list members: ${membersError.message}`);

                for (const m of memberships ?? []) {
                    try {
                        const { enqueued } = await enqueueReengagementIfAtRisk(
                            clubId,
                            m.user_id as string,
                            { weekKey },
                        );
                        if (enqueued) results.reengagementsEnqueued += 1;
                    } catch (err) {
                        results.errors.push(
                            `churn ${clubId}/${m.user_id}: ${err instanceof Error ? err.message : String(err)}`,
                        );
                    }
                }
            } catch (err) {
                results.errors.push(
                    `churn-scan ${clubId}: ${err instanceof Error ? err.message : String(err)}`,
                );
            }
        }

        console.log(
            `[CRON ai-digest] week=${weekKey} clubs=${results.clubs} ` +
                `digests=${results.digestsEnqueued} reengagements=${results.reengagementsEnqueued} ` +
                `errors=${results.errors.length}`,
        );
        return NextResponse.json({ ok: true, week: weekKey, ...results });
    } catch (err) {
        console.error('[CRON ai-digest] Fatal:', err);
        return NextResponse.json(
            { error: err instanceof Error ? err.message : 'Cron failed' },
            { status: 500 },
        );
    }
}
