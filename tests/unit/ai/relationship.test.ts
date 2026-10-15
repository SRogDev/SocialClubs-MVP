/**
 * Tests for lib/ai/relationship.ts — relationship intelligence
 * (member_signals): profile aggregation, churn heuristic, signal recording.
 *
 * TDD: written BEFORE the implementation (RED first).
 */
import {
    aggregateProfile,
    assessChurnRisk,
    recordSignal,
    recordSignalSafe,
    type MemberSignal,
    type NewMemberSignal,
    type RelationshipDeps,
    type SignalDb,
} from '@/lib/ai/relationship';

function signal(overrides: Partial<MemberSignal> = {}): MemberSignal {
    return {
        id: 'sig-1',
        club_id: 'club-1',
        user_id: 'user-1',
        signal_type: 'posted',
        payload: {},
        created_at: '2026-10-10T12:00:00.000Z',
        ...overrides,
    };
}

/** In-memory SignalDb stub that records every insert. */
function stubDb(initial: MemberSignal[] = []): SignalDb & { inserted: NewMemberSignal[] } {
    const rows = [...initial];
    const inserted: NewMemberSignal[] = [];
    return {
        inserted,
        async insertSignal(row: NewMemberSignal): Promise<MemberSignal> {
            inserted.push(row);
            const created: MemberSignal = {
                id: `sig-${inserted.length}`,
                club_id: row.club_id,
                user_id: row.user_id,
                signal_type: row.signal_type,
                payload: row.payload ?? {},
                created_at: new Date().toISOString(),
            };
            rows.push(created);
            return created;
        },
        async listSignals(clubId: string, userId: string): Promise<MemberSignal[]> {
            return rows
                .filter((r) => r.club_id === clubId && r.user_id === userId)
                .sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
        },
    };
}

const NOW = new Date('2026-10-15T12:00:00.000Z');
const deps = (db: SignalDb): RelationshipDeps => ({ db, now: () => NOW });

describe('aggregateProfile', () => {
    test('ranks interests by tag frequency, top 5', () => {
        const rows = [
            signal({ payload: { tags: ['chess', 'salsa'] } }),
            signal({ payload: { tags: ['chess'] } }),
            signal({ payload: { tags: ['chess', 'salsa', 'running', 'yoga', 'cycling', 'swim'] } }),
            signal({ payload: { tags: ['salsa'] } }),
        ];
        const profile = aggregateProfile('club-1', 'user-1', rows, NOW);
        expect(profile.interests.map((i) => i.tag)).toEqual([
            'chess',
            'salsa',
            'cycling',
            'running',
            'swim',
        ]);
        expect(profile.interests[0]).toEqual({ tag: 'chess', count: 3 });
        expect(profile.interests[1]).toEqual({ tag: 'salsa', count: 3 });
        expect(profile.interests).toHaveLength(5);
    });

    test('ignores non-string and non-array tags payloads', () => {
        const rows = [
            signal({ payload: { tags: 'chess' } }),
            signal({ payload: { tags: ['chess', 42, null] } }),
            signal({ payload: {} }),
        ];
        const profile = aggregateProfile('club-1', 'user-1', rows, NOW);
        expect(profile.interests).toEqual([{ tag: 'chess', count: 1 }]);
    });

    test('detects an upward engagement trend (recent week busier than previous)', () => {
        const rows = [
            // previous week (Oct 1–7): 1 activity
            signal({ signal_type: 'posted', created_at: '2026-10-03T10:00:00.000Z' }),
            // recent week (Oct 8–15): 4 activities
            signal({ signal_type: 'posted', created_at: '2026-10-09T10:00:00.000Z' }),
            signal({ signal_type: 'engaged', created_at: '2026-10-11T10:00:00.000Z' }),
            signal({ signal_type: 'engaged', created_at: '2026-10-13T10:00:00.000Z' }),
            signal({ signal_type: 'posted', created_at: '2026-10-14T10:00:00.000Z' }),
        ];
        const profile = aggregateProfile('club-1', 'user-1', rows, NOW);
        expect(profile.engagementTrend).toBe('up');
    });

    test('detects a downward engagement trend', () => {
        const rows = [
            signal({ signal_type: 'posted', created_at: '2026-10-02T10:00:00.000Z' }),
            signal({ signal_type: 'posted', created_at: '2026-10-04T10:00:00.000Z' }),
            signal({ signal_type: 'engaged', created_at: '2026-10-06T10:00:00.000Z' }),
            signal({ signal_type: 'engaged', created_at: '2026-10-14T10:00:00.000Z' }),
        ];
        const profile = aggregateProfile('club-1', 'user-1', rows, NOW);
        expect(profile.engagementTrend).toBe('down');
    });

    test('flat trend when activity is steady or absent', () => {
        const steady = [
            signal({ signal_type: 'posted', created_at: '2026-10-03T10:00:00.000Z' }),
            signal({ signal_type: 'posted', created_at: '2026-10-10T10:00:00.000Z' }),
        ];
        expect(aggregateProfile('club-1', 'user-1', steady, NOW).engagementTrend).toBe('flat');

        const empty: MemberSignal[] = [];
        const profile = aggregateProfile('club-1', 'user-1', empty, NOW);
        expect(profile.engagementTrend).toBe('flat');
        expect(profile.lastActive).toBeNull();
        expect(profile.interests).toEqual([]);
    });

    test('collects milestones newest-first and reports lastActive', () => {
        const rows = [
            signal({
                signal_type: 'milestone',
                payload: { label: 'First post' },
                created_at: '2026-10-01T10:00:00.000Z',
            }),
            signal({
                signal_type: 'milestone',
                payload: { label: '100 points' },
                created_at: '2026-10-12T10:00:00.000Z',
            }),
            signal({ signal_type: 'posted', created_at: '2026-10-14T09:00:00.000Z' }),
        ];
        const profile = aggregateProfile('club-1', 'user-1', rows, NOW);
        expect(profile.milestones).toEqual([
            { label: '100 points', at: '2026-10-12T10:00:00.000Z' },
            { label: 'First post', at: '2026-10-01T10:00:00.000Z' },
        ]);
        expect(profile.lastActive).toBe('2026-10-14T09:00:00.000Z');
        expect(profile.signalCount).toBe(3);
    });
});

describe('assessChurnRisk', () => {
    test('active-then-silent member is at risk', () => {
        const rows = [
            signal({ signal_type: 'posted', created_at: '2026-09-20T10:00:00.000Z' }),
            signal({ signal_type: 'engaged', created_at: '2026-09-25T10:00:00.000Z' }),
            signal({ signal_type: 'posted', created_at: '2026-09-28T10:00:00.000Z' }),
        ];
        const assessment = assessChurnRisk(rows, NOW);
        expect(assessment.atRisk).toBe(true);
        expect(assessment.daysSinceActive).toBe(17);
        expect(assessment.reason).toMatch(/17 days/);
    });

    test('new member with recent activity is NOT at risk', () => {
        const rows = [
            signal({ signal_type: 'posted', created_at: '2026-10-13T10:00:00.000Z' }),
            signal({ signal_type: 'engaged', created_at: '2026-10-14T10:00:00.000Z' }),
        ];
        const assessment = assessChurnRisk(rows, NOW);
        expect(assessment.atRisk).toBe(false);
        expect(assessment.daysSinceActive).toBe(1);
    });

    test('member with no recorded activity is NOT at risk (nothing to churn from)', () => {
        const assessment = assessChurnRisk([], NOW);
        expect(assessment.atRisk).toBe(false);
        expect(assessment.daysSinceActive).toBeNull();
    });

    test('member active within the last 14 days is NOT at risk', () => {
        const rows = [
            signal({ signal_type: 'posted', created_at: '2026-08-01T10:00:00.000Z' }),
            signal({ signal_type: 'engaged', created_at: '2026-10-10T10:00:00.000Z' }),
        ];
        const assessment = assessChurnRisk(rows, NOW);
        expect(assessment.atRisk).toBe(false);
        expect(assessment.daysSinceActive).toBe(5);
    });

    test('only non-activity signals (preference/milestone) do not count as activity', () => {
        const rows = [
            signal({
                signal_type: 'preference',
                payload: { theme: 'dark' },
                created_at: '2026-09-01T10:00:00.000Z',
            }),
        ];
        const assessment = assessChurnRisk(rows, NOW);
        expect(assessment.atRisk).toBe(false);
        expect(assessment.daysSinceActive).toBeNull();
    });
});

describe('recordSignal', () => {
    test('appends one row to the signal store', async () => {
        const db = stubDb();
        const row = await recordSignal(
            {
                clubId: 'club-1',
                userId: 'user-1',
                type: 'posted',
                payload: { postId: 'p-1', tags: ['chess'] },
            },
            deps(db),
        );
        expect(row.id).toBe('sig-1');
        expect(row.signal_type).toBe('posted');
        expect(db.inserted).toHaveLength(1);
        expect(db.inserted[0]).toMatchObject({
            club_id: 'club-1',
            user_id: 'user-1',
            signal_type: 'posted',
        });
    });

    test('rejects empty identifiers', async () => {
        const db = stubDb();
        await expect(
            recordSignal({ clubId: '', userId: 'user-1', type: 'posted' }, deps(db)),
        ).rejects.toThrow();
        expect(db.inserted).toHaveLength(0);
    });
});

describe('recordSignalSafe', () => {
    test('never throws when the store fails (fire-and-forget)', async () => {
        const failingDb: SignalDb = {
            async insertSignal() {
                throw new Error('DB down');
            },
            async listSignals() {
                return [];
            },
        };
        await expect(
            recordSignalSafe(
                { clubId: 'club-1', userId: 'user-1', type: 'engaged' },
                { db: failingDb },
            ),
        ).resolves.toBeUndefined();
    });
});
