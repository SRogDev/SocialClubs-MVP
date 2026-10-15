/**
 * GET /api/cron/ai-briefing
 *
 * Daily AI-staff briefing (Vercel Cron, configured in vercel.json —
 * daily 08:00 Havana time = 12:00 UTC). For every club (capped):
 *   1. Counts pending AI drafts awaiting review.
 *   2. Summarizes yesterday's AI actions (proposed vs executed) and spend.
 *   3. Sends one `daily_briefing` notification to the club creator.
 *
 * The briefing text is deterministic (buildBriefing from lib/ai/analytics)
 * — no LLM call, so the cron costs $0. Per-day idempotency: a club that
 * already received today's briefing is skipped, making retries safe.
 *
 * Called by Vercel Cron with CRON_SECRET (same pattern as ai-digest).
 */
import { createClient } from '@supabase/supabase-js';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { buildBriefing, getActionStats, supabaseAnalyticsDb } from '@/lib/ai/analytics';

const MAX_CLUBS = 100;

function serviceRoleClient() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !serviceKey) {
        throw new Error('Supabase service-role env is not configured');
    }
    return createClient(url, serviceKey);
}

function dateKeyUtc(d: Date): string {
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

function dateLabelEs(d: Date): string {
    return d.toLocaleDateString('es-ES', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        timeZone: 'America/Havana',
    });
}

interface BriefingOutcome {
    kind: 'sent' | 'skipped' | 'error';
    error?: string;
}

/** One club's daily briefing. Returns whether the notification was sent. */
async function processClubBriefing(
    club: { id: string; name: string | null; creator: string | null },
    key: string,
    now: Date,
    supabase: ReturnType<typeof serviceRoleClient>,
    db: ReturnType<typeof supabaseAnalyticsDb>,
): Promise<BriefingOutcome> {
    const clubId = club.id;

    // Idempotency: one briefing per club per day.
    const { data: existing, error: existErr } = await supabase
        .from('notifications')
        .select('id')
        .eq('club_id', clubId)
        .eq('metadata->>type', 'daily_briefing')
        .eq('metadata->>date', key)
        .limit(1);
    if (existErr) throw new Error(`briefing check: ${existErr.message}`);
    if ((existing ?? []).length > 0) return { kind: 'skipped' };
    if (!club.creator) throw new Error('club has no creator');

    const [pendingDrafts, stats, usage] = await Promise.all([
        db.listPendingDrafts(clubId),
        getActionStats(clubId, 1, { db, now: () => now }),
        db.listUsageSamples(clubId, new Date(now.getTime() - 24 * 3600 * 1000).toISOString()),
    ]);
    const spendYesterdayUsd = usage.reduce((sum, u) => sum + (u.cost_usd || 0), 0);

    const body = buildBriefing({
        clubName: club.name ?? 'tu club',
        dateLabel: dateLabelEs(now),
        pendingDrafts: pendingDrafts.length,
        actionsYesterday: stats.total,
        executedYesterday: stats.byStatus['executed'] ?? 0,
        spendYesterdayUsd,
        currencyNote: 'Costos incluidos en el margen de la plataforma.',
    });

    const { error: insertErr } = await supabase.from('notifications').insert({
        user_id: club.creator,
        type: 'other',
        title: `🤖 Resumen diario de tu staff de IA`,
        body,
        club_id: clubId,
        icon: '🤖',
        category: 'engagement',
        metadata: { source: 'ai-briefing', type: 'daily_briefing', date: key },
        read: false,
    });
    if (insertErr) throw new Error(`insert notification: ${insertErr.message}`);
    return { kind: 'sent' };
}

export async function GET(request: NextRequest) {
    try {
        // Verify cron secret for security (same pattern as ai-digest)
        const authHeader = request.headers.get('authorization');
        const cronSecret = process.env.CRON_SECRET;

        if (!cronSecret) {
            console.error('[CRON ai-briefing] CRON_SECRET not configured');
            return NextResponse.json({ error: 'Cron secret not configured' }, { status: 500 });
        }

        if (authHeader !== `Bearer ${cronSecret}`) {
            console.error('[CRON ai-briefing] Invalid cron authorization');
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const now = new Date();
        const key = dateKeyUtc(now);
        const supabase = serviceRoleClient();
        const db = supabaseAnalyticsDb();
        const results = {
            clubs: 0,
            sent: 0,
            skipped: 0,
            errors: [] as string[],
        };

        const { data: clubs, error: clubsError } = await supabase
            .from('clubs')
            .select('id, name, creator')
            .limit(MAX_CLUBS);
        if (clubsError) throw new Error(`list clubs: ${clubsError.message}`);

        for (const club of (clubs ?? []) as { id: string; name: string | null; creator: string | null }[]) {
            results.clubs += 1;
            try {
                const outcome = await processClubBriefing(club, key, now, supabase, db);
                if (outcome.kind === 'sent') results.sent += 1;
                else results.skipped += 1;
            } catch (err) {
                results.errors.push(
                    `briefing ${club.id}: ${err instanceof Error ? err.message : String(err)}`,
                );
            }
        }

        console.log(
            `[CRON ai-briefing] date=${key} clubs=${results.clubs} sent=${results.sent} ` +
                `skipped=${results.skipped} errors=${results.errors.length}`,
        );
        return NextResponse.json({ ok: true, date: key, ...results });
    } catch (err) {
        console.error('[CRON ai-briefing] Fatal:', err);
        return NextResponse.json(
            { error: err instanceof Error ? err.message : 'Cron failed' },
            { status: 500 },
        );
    }
}
