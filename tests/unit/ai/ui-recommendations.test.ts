/**
 * Sentient UI — recommendation engine tests (master plan Phases 58-62).
 *
 * `buildRecommendations` is pure: it turns already-fetched club data
 * (member activity, pending AI drafts, ai_signals rows, upcoming events)
 * into UI-ready recommendations. `computePulse` derives the club pulse from
 * signal activity — deterministic, no LLM.
 *
 * Signal types follow lib/ai/signals.ts ('new_post', 'member_joined',
 * 'points_milestone'); member identity is read from the payload.
 *
 * Every recommendation must explain its reason ("porque X") in `body`.
 */
import {
    buildRecommendations,
    computePulse,
    signalUserId,
    type ClubSignalSummary,
    type DraftSummary,
    type MemberActivity,
    type RecommendationInput,
    type UpcomingEvent,
} from '@/lib/ai/ui-recommendations';

const NOW = new Date('2026-10-15T12:00:00.000Z');

function daysAgo(n: number): string {
    return new Date(NOW.getTime() - n * 24 * 3600 * 1000).toISOString();
}

function baseInput(overrides: Partial<RecommendationInput> = {}): RecommendationInput {
    return {
        clubId: 'club-1',
        requesterUserId: 'user-staff',
        requesterRole: 'admin',
        members: [],
        pendingDrafts: [],
        clubSignals: [],
        upcomingEvents: [],
        ...overrides,
    };
}

function member(overrides: Partial<MemberActivity> = {}): MemberActivity {
    return {
        userId: 'user-1',
        name: 'Ana',
        lastActiveAt: daysAgo(1),
        everActive: true,
        ...overrides,
    };
}

function draft(overrides: Partial<DraftSummary> = {}): DraftSummary {
    return {
        id: 'draft-1',
        title: 'Borrador de bienvenida',
        workflowName: 'welcome',
        createdAt: daysAgo(0),
        ...overrides,
    };
}

function signal(overrides: Partial<ClubSignalSummary> = {}): ClubSignalSummary {
    return {
        id: 'sig-1',
        userId: 'user-2',
        type: 'new_post',
        payload: { authorId: 'user-2' },
        createdAt: daysAgo(0),
        ...overrides,
    };
}

function event(overrides: Partial<UpcomingEvent> = {}): UpcomingEvent {
    return {
        id: 'event-1',
        title: 'Torneo de ajedrez',
        startsAt: new Date(NOW.getTime() + 2 * 24 * 3600 * 1000).toISOString(),
        ...overrides,
    };
}

describe('signalUserId', () => {
    test('reads userId, authorId, recipientId from the payload', () => {
        expect(signalUserId({ userId: 'a' })).toBe('a');
        expect(signalUserId({ authorId: 'b' })).toBe('b');
        expect(signalUserId({ recipientId: 'c' })).toBe('c');
        expect(signalUserId({})).toBeNull();
        expect(signalUserId({ userId: '' })).toBeNull();
    });
});

describe('buildRecommendations', () => {
    test('no signals → empty list', () => {
        expect(buildRecommendations(baseInput(), NOW)).toEqual([]);
    });

    test('churn-risk member → nudge explaining the reason', () => {
        const recs = buildRecommendations(
            baseInput({
                members: [member({ lastActiveAt: daysAgo(20) })],
                // Recent post keeps the quiet-club insight out of this test.
                clubSignals: [signal({ createdAt: daysAgo(0) })],
            }),
            NOW,
        );
        expect(recs).toHaveLength(1);
        const [rec] = recs;
        expect(rec.kind).toBe('nudge');
        expect(rec.title).toContain('Ana');
        // The recommendation must explain WHY ("porque X")
        expect(rec.body).toMatch(/20 días/);
        expect(rec.body).toMatch(/sin actividad/);
        expect(rec.userId).toBe('user-1');
        // Expiry is a future ISO date
        expect(new Date(rec.expiresAt).getTime()).toBeGreaterThan(NOW.getTime());
    });

    test('recently active member → no churn nudge', () => {
        const recs = buildRecommendations(
            baseInput({ members: [member({ lastActiveAt: daysAgo(2) })] }),
            NOW,
        );
        expect(recs.filter((r) => r.kind === 'nudge')).toEqual([]);
    });

    test('churn nudge is staff-only: plain members never see who went quiet', () => {
        const input = baseInput({
            requesterRole: 'member',
            members: [member({ lastActiveAt: daysAgo(20) })],
            clubSignals: [signal({ createdAt: daysAgo(0) })],
        });
        const recs = buildRecommendations(input, NOW);
        expect(recs.filter((r) => r.kind === 'nudge')).toEqual([]);
    });

    test('churn list is bounded: at most 3 churn nudges', () => {
        const members = Array.from({ length: 10 }, (_, i) =>
            member({ userId: `user-${i}`, name: `Miembro ${i}`, lastActiveAt: daysAgo(30) }),
        );
        const recs = buildRecommendations(baseInput({ members }), NOW);
        const churn = recs.filter((r) => r.kind === 'nudge');
        expect(churn).toHaveLength(3);
    });

    test('pending drafts → highlight with count and reason', () => {
        const recs = buildRecommendations(
            baseInput({ pendingDrafts: [draft(), draft({ id: 'draft-2' }), draft({ id: 'draft-3' })] }),
            NOW,
        );
        expect(recs).toHaveLength(1);
        const [rec] = recs;
        expect(rec.kind).toBe('highlight');
        expect(rec.title).toMatch(/3 borradores/);
        expect(rec.body).toMatch(/porque/);
        expect(rec.action).toBeDefined();
        expect(rec.action?.href).toContain('club-1');
    });

    test('new member joined recently → welcome suggest_action', () => {
        const recs = buildRecommendations(
            baseInput({
                clubSignals: [signal({ type: 'member_joined', userId: 'user-new', payload: { userId: 'user-new' }, createdAt: daysAgo(1) })],
                members: [member({ userId: 'user-new', name: 'Bruno', lastActiveAt: null, everActive: false })],
            }),
            NOW,
        );
        const welcome = recs.find((r) => r.kind === 'suggest_action');
        expect(welcome).toBeDefined();
        expect(welcome?.title).toContain('Bruno');
        expect(welcome?.body).toMatch(/porque/);
    });

    test('quiet club (no activity in 7 days) → insight with reason', () => {
        const recs = buildRecommendations(
            baseInput({
                members: [member({ lastActiveAt: daysAgo(10) })],
            }),
            NOW,
        );
        const insight = recs.find((r) => r.kind === 'insight');
        expect(insight).toBeDefined();
        expect(insight?.body).toMatch(/7 días/);
    });

    test('upcoming event → highlight with event name', () => {
        const recs = buildRecommendations(
            baseInput({ upcomingEvents: [event()] }),
            NOW,
        );
        const highlight = recs.find((r) => r.kind === 'highlight' && r.title.includes('ajedrez'));
        expect(highlight).toBeDefined();
        expect(highlight?.body).toMatch(/porque/);
        expect(highlight?.expiresAt).toBe(event().startsAt);
    });

    test('past or far-future events are ignored', () => {
        const recs = buildRecommendations(
            baseInput({
                upcomingEvents: [
                    event({ id: 'e-past', startsAt: daysAgo(1) }),
                    event({ id: 'e-far', startsAt: new Date(NOW.getTime() + 30 * 24 * 3600 * 1000).toISOString() }),
                ],
            }),
            NOW,
        );
        expect(recs.filter((r) => r.id.includes(':event:'))).toEqual([]);
    });

    test('priority ordering: churn nudge (4) before insight (2)', () => {
        const recs = buildRecommendations(
            baseInput({
                members: [member({ lastActiveAt: daysAgo(20) }), member({ userId: 'user-2', name: 'Ciro', lastActiveAt: daysAgo(10) })],
            }),
            NOW,
        );
        expect(recs.length).toBeGreaterThanOrEqual(2);
        const priorities = recs.map((r) => r.priority);
        const sorted = [...priorities].sort((a, b) => b - a);
        expect(priorities).toEqual(sorted);
    });

    test('recommendations carry stable ids scoped to club', () => {
        const recs = buildRecommendations(
            baseInput({
                members: [member({ lastActiveAt: daysAgo(20) })],
                clubSignals: [signal({ createdAt: daysAgo(0) })],
            }),
            NOW,
        );
        expect(recs[0].id).toContain('club-1');
        expect(recs[0].clubId).toBe('club-1');
    });

    test('expired-welcome: join older than 7 days → no welcome nudge', () => {
        const recs = buildRecommendations(
            baseInput({
                clubSignals: [signal({ type: 'member_joined', userId: 'user-new', payload: { userId: 'user-new' }, createdAt: daysAgo(10) })],
                members: [member({ userId: 'user-new', name: 'Bruno', lastActiveAt: null, everActive: false })],
            }),
            NOW,
        );
        expect(recs.find((r) => r.kind === 'suggest_action')).toBeUndefined();
    });
});

describe('computePulse', () => {
    test('recent dense activity → active (green)', () => {
        const signals = Array.from({ length: 12 }, (_, i) =>
            signal({ id: `s-${i}`, createdAt: new Date(NOW.getTime() - i * 3600 * 1000).toISOString() }),
        );
        const pulse = computePulse({ clubSignals: signals }, NOW);
        expect(pulse.level).toBe('active');
        expect(pulse.activityCount).toBe(12);
    });

    test('some activity → steady (yellow)', () => {
        const signals = [signal({ createdAt: new Date(NOW.getTime() - 2 * 3600 * 1000).toISOString() })];
        const pulse = computePulse({ clubSignals: signals }, NOW);
        expect(pulse.level).toBe('steady');
    });

    test('no activity in window → quiet (red)', () => {
        const pulse = computePulse(
            { clubSignals: [signal({ createdAt: daysAgo(5) })] },
            NOW,
        );
        expect(pulse.level).toBe('quiet');
        expect(pulse.activityCount).toBe(0);
    });

    test('pulse carries an update timestamp', () => {
        const pulse = computePulse({ clubSignals: [] }, NOW);
        expect(pulse.updatedAt).toBe(NOW.toISOString());
    });
});
