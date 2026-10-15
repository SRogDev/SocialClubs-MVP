/**
 * Tests for lib/ai/analytics.ts (master plan Phases 77-80):
 * staff health aggregation, action funnel math, approval rate, Pearson
 * correlations (honestly labeled), and the daily briefing content.
 *
 * RED first: analytics.ts does not exist yet.
 */
import {
    buildBriefing,
    getActionStats,
    getClubAnalytics,
    getEngagementImpact,
    getStaffHealth,
    pearson,
    type AnalyticsDb,
    type AnalyticsDeps,
} from '@/lib/ai/analytics';

function action(
    id: string,
    agentId: string,
    actionName: string,
    status: string,
    createdAt: string,
) {
    return { id, club_id: 'club-1', agent_id: agentId, action: actionName, status, created_at: createdAt };
}

function review(actionId: string, reviewerType: string, decision: string) {
    return { action_id: actionId, reviewer_type: reviewerType, decision, created_at: '2026-10-14T12:00:00Z' };
}

const EMPTY_DB: AnalyticsDb = {
    listActions: async () => [],
    listReviews: async () => [],
    listUsageSamples: async () => [],
    listSignalSamples: async () => [],
    listPendingDrafts: async () => [],
    getEnabledAgents: async () => [],
};

function deps(db: Partial<AnalyticsDb>, now: Date = new Date('2026-10-15T12:00:00Z')): AnalyticsDeps {
    return { db: { ...EMPTY_DB, ...db }, now: () => now };
}

describe('getStaffHealth', () => {
    it('aggregates per-agent health: enabled, last run, success rate, error rate', async () => {
        const d = deps({
            getEnabledAgents: async () => ['community-manager'],
            listActions: async () => [
                action('a1', 'community-manager', 'send_welcome', 'executed', '2026-10-14T10:00:00Z'),
                action('a2', 'community-manager', 'send_welcome', 'executed', '2026-10-15T09:00:00Z'),
                action('a3', 'community-manager', 'post_digest', 'failed', '2026-10-15T08:00:00Z'),
                action('b1', 'creator-copilot', 'notify_creator', 'executed', '2026-10-13T10:00:00Z'),
            ],
            listUsageSamples: async () => [
                { agent_id: 'community-manager', latency_ms: 800, cost_usd: 0.001 },
                { agent_id: 'community-manager', latency_ms: 1200, cost_usd: 0.002 },
            ],
        });
        const health = await getStaffHealth('club-1', d);

        const cm = health.find((h) => h.agentId === 'community-manager')!;
        expect(cm.enabled).toBe(true);
        expect(cm.lastRunAt).toBe('2026-10-15T09:00:00Z');
        expect(cm.actionsTotal).toBe(3);
        // success = executed / (executed + failed + blocked)
        expect(cm.successRate).toBeCloseTo(2 / 3, 6);
        expect(cm.errorRate).toBeCloseTo(1 / 3, 6);
        expect(cm.avgLatencyMs).toBe(1000);
        expect(cm.status).toBe('degraded'); // errorRate 0.33 > 0.2

        const cc = health.find((h) => h.agentId === 'creator-copilot')!;
        expect(cc.enabled).toBe(false);
        expect(cc.status).toBe('disabled');
        expect(cc.trustExplanation.what.length).toBeGreaterThan(0);
        expect(cc.trustExplanation.limits.length).toBeGreaterThan(0);
    });

    it('marks an enabled agent with no runs as idle, with null rates', async () => {
        const d = deps({
            getEnabledAgents: async () => ['experience-director'],
        });
        const health = await getStaffHealth('club-1', d);
        const ed = health.find((h) => h.agentId === 'experience-director')!;
        expect(ed.enabled).toBe(true);
        expect(ed.status).toBe('idle');
        expect(ed.lastRunAt).toBeNull();
        expect(ed.successRate).toBeNull();
        expect(ed.avgLatencyMs).toBeNull();
        expect(ed.actionsTotal).toBe(0);
    });

    it('marks a healthy agent healthy when there are no errors', async () => {
        const d = deps({
            getEnabledAgents: async () => ['community-manager'],
            listActions: async () => [
                action('a1', 'community-manager', 'send_welcome', 'executed', '2026-10-15T09:00:00Z'),
            ],
        });
        const health = await getStaffHealth('club-1', d);
        expect(health[0].status).toBe('healthy');
        expect(health[0].successRate).toBe(1);
    });
});

describe('getActionStats', () => {
    it('computes byType, byStatus, the funnel, and the approval rate', async () => {
        const d = deps({
            listActions: async () => [
                action('a1', 'community-manager', 'send_welcome', 'executed', '2026-10-14T10:00:00Z'),
                action('a2', 'community-manager', 'send_welcome', 'pending_approval', '2026-10-15T09:00:00Z'),
                action('a3', 'community-manager', 'post_digest', 'draft', '2026-10-15T08:00:00Z'),
                action('a4', 'experience-director', 'propose_event', 'executed', '2026-10-14T11:00:00Z'),
            ],
            listReviews: async (ids) =>
                ids.flatMap((id) => {
                    if (id === 'a1') return [review(id, 'human', 'approved')];
                    if (id === 'a4') return [review(id, 'human', 'rejected')];
                    return [];
                }),
        });
        const stats = await getActionStats('club-1', 30, d);

        expect(stats.total).toBe(4);
        expect(stats.byType.find((t) => t.type === 'send_welcome')?.count).toBe(2);
        expect(stats.byType.find((t) => t.type === 'post_digest')?.count).toBe(1);
        expect(stats.byStatus['executed']).toBe(2);
        expect(stats.byStatus['pending_approval']).toBe(1);

        // Funnel: proposed -> approved (human decisions) -> executed; pending = undecided
        expect(stats.funnel.proposed).toBe(4);
        expect(stats.funnel.approved).toBe(1);
        expect(stats.funnel.executed).toBe(2);
        expect(stats.funnel.pending).toBe(2); // a2 pending_approval + a3 draft

        expect(stats.approvedCount).toBe(1);
        expect(stats.rejectedCount).toBe(1);
        expect(stats.approvalRate).toBe(0.5);
    });

    it('returns a null approval rate when there are no human decisions', async () => {
        const d = deps({
            listActions: async () => [
                action('a1', 'community-manager', 'send_welcome', 'executed', '2026-10-15T09:00:00Z'),
            ],
            listReviews: async () => [],
        });
        const stats = await getActionStats('club-1', 30, d);
        expect(stats.approvalRate).toBeNull();
        expect(stats.funnel.approved).toBe(0);
    });
});

describe('pearson', () => {
    it('returns ~1 for perfectly correlated series', () => {
        expect(pearson([1, 2, 3, 4], [2, 4, 6, 8])).toBeCloseTo(1, 6);
    });

    it('returns ~-1 for perfectly anti-correlated series', () => {
        expect(pearson([1, 2, 3, 4], [8, 6, 4, 2])).toBeCloseTo(-1, 6);
    });

    it('returns null when there is no variance or not enough data', () => {
        expect(pearson([1, 1, 1], [2, 3, 4])).toBeNull();
        expect(pearson([1], [2])).toBeNull();
    });
});

describe('getEngagementImpact', () => {
    it('correlates onboarding actions with new posts and labels it a correlation', async () => {
        const d = deps({
            listActions: async () => [
                // week 1 bucket (days 14-21 back): 2 welcomes, week 2 bucket: 0
                action('a1', 'community-manager', 'send_welcome', 'executed', '2026-10-01T10:00:00Z'),
                action('a2', 'community-manager', 'send_welcome', 'executed', '2026-10-02T10:00:00Z'),
            ],
            listSignalSamples: async () => [
                // more new_post signals in the same bucket as the welcomes
                { type: 'new_post', created_at: '2026-10-01T11:00:00Z' },
                { type: 'new_post', created_at: '2026-10-02T11:00:00Z' },
                { type: 'new_post', created_at: '2026-10-03T11:00:00Z' },
                { type: 'member_joined', created_at: '2026-10-10T11:00:00Z' },
            ],
        });
        const impact = await getEngagementImpact('club-1', 28, d);

        expect(impact.correlations.length).toBeGreaterThanOrEqual(2);
        for (const c of impact.correlations) {
            expect(c.kind).toBe('correlacion');
            expect(c.caveat).toMatch(/correlaci/);
            // The caveat must explicitly disclaim causation.
            expect(c.caveat.toLowerCase()).toMatch(/no.*causa/);
        }
        const onboarding = impact.correlations.find((c) => c.name === 'onboarding_posts')!;
        expect(onboarding.coefficient).not.toBeNull();
    });

    it('returns null coefficients when there is no signal data', async () => {
        const d = deps({});
        const impact = await getEngagementImpact('club-1', 28, d);
        for (const c of impact.correlations) {
            expect(c.coefficient).toBeNull();
            expect(c.sampleBuckets).toBe(0);
        }
    });
});

describe('getClubAnalytics', () => {
    it('combines health, stats, and engagement in one payload', async () => {
        const d = deps({
            getEnabledAgents: async () => ['community-manager'],
            listActions: async () => [
                action('a1', 'community-manager', 'send_welcome', 'executed', '2026-10-15T09:00:00Z'),
            ],
        });
        const analytics = await getClubAnalytics('club-1', 30, d);
        expect(analytics.clubId).toBe('club-1');
        expect(analytics.days).toBe(30);
        expect(analytics.health.length).toBeGreaterThan(0);
        expect(analytics.stats.total).toBe(1);
        expect(analytics.engagement.correlations.length).toBeGreaterThan(0);
        expect(analytics.generatedAt).toBeDefined();
    });
});

describe('buildBriefing', () => {
    it('writes a deterministic Spanish briefing with the key counts', () => {
        const text = buildBriefing({
            clubName: 'Club Demo',
            dateLabel: '14 de octubre de 2026',
            pendingDrafts: 3,
            actionsYesterday: 5,
            executedYesterday: 2,
            spendYesterdayUsd: 0.0123,
            currencyNote: 'Costos incluidos en el margen de la plataforma.',
        });
        expect(text).toContain('Club Demo');
        expect(text).toContain('3 borradores');
        expect(text).toContain('5 acciones');
        expect(text).toContain('2 ejecutadas');
        expect(text).toContain('$0.0123');
        // Plain Spanish, no invented certainty: marks that the summary is automatic
        expect(text.toLowerCase()).toMatch(/resumen automático|generado autom/);
    });
});
