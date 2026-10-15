/**
 * Tests for Phases 73-76: AI security + privacy + member control.
 *
 * - lib/ai/transparency.ts: AI disclosure labels, markAsAIGenerated, the
 *   ai_actions audit read (club-scoped, PII-sanitized).
 * - lib/ai/member-control.ts: member AI preferences, personalization
 *   opt-out (empty profile), proactive-send opt-out (skip).
 *
 * TDD: written BEFORE the implementation (RED first).
 */
import {
    AI_DISCLOSURE_EN,
    AI_DISCLOSURE_ES,
    getAILabel,
    listAiActions,
    markAsAIGenerated,
    type AiAction,
    type AuditDb,
} from '@/lib/ai/transparency';
import {
    DEFAULT_MEMBER_PREFERENCES,
    getMemberPreferences,
    getMemberProfileWithConsent,
    setMemberPreferences,
    shouldSkipPersonalization,
    shouldSkipProactiveSend,
    type MemberAiPreferences,
    type PreferencesDb,
} from '@/lib/ai/member-control';
import type { MemberProfile, MemberSignal } from '@/lib/ai/relationship';

const NOW = new Date('2026-10-15T18:00:00.000Z');

// ---------------------------------------------------------------------------
// Disclosure labels
// ---------------------------------------------------------------------------

describe('AI disclosure', () => {
    test('disclosure constants exist in Spanish and English', () => {
        expect(AI_DISCLOSURE_ES).toContain('generado o asistido por la IA del club');
        expect(AI_DISCLOSURE_EN).toContain("club's AI");
    });

    test('markAsAIGenerated attaches metadata without changing content', () => {
        const marked = markAsAIGenerated('Hola, bienvenido al club', {
            agentId: 'community-manager',
            actionId: 'send_message',
            now: () => NOW,
        });
        expect(marked.content).toBe('Hola, bienvenido al club');
        expect(marked.aiMetadata).toEqual({
            ai_generated: true,
            agent_id: 'community-manager',
            action_id: 'send_message',
            timestamp: NOW.toISOString(),
        });
    });

    test('markAsAIGenerated requires agentId and actionId', () => {
        expect(() =>
            markAsAIGenerated('x', { agentId: '', actionId: 'send_message' }),
        ).toThrow();
    });

    test('getAILabel returns the disclosure for a known action (ES default)', () => {
        expect(getAILabel('send_message')).toBe(AI_DISCLOSURE_ES);
    });

    test('getAILabel returns the English disclosure on request', () => {
        expect(getAILabel('send_message', 'en')).toBe(AI_DISCLOSURE_EN);
    });

    test('getAILabel returns the generic disclosure for unknown actions', () => {
        expect(getAILabel('some-future-action')).toBe(AI_DISCLOSURE_ES);
        expect(getAILabel('some-future-action', 'en')).toBe(AI_DISCLOSURE_EN);
    });
});

// ---------------------------------------------------------------------------
// Member preferences (stubbed storage)
// ---------------------------------------------------------------------------

function prefRow(overrides: Partial<MemberAiPreferences> = {}): MemberAiPreferences {
    return {
        user_id: 'user-1',
        club_id: 'club-1',
        allow_personalization: true,
        allow_proactive_messages: true,
        updated_at: NOW.toISOString(),
        ...overrides,
    };
}

function stubPrefsDb(initial: MemberAiPreferences[] = []): PreferencesDb {
    const rows = [...initial];
    return {
        async getPreferences(userId: string, clubId: string) {
            return rows.find((r) => r.user_id === userId && r.club_id === clubId) ?? null;
        },
        async upsertPreferences(userId: string, clubId: string, values: { allow_personalization: boolean; allow_proactive_messages: boolean }) {
            const existing = rows.find((r) => r.user_id === userId && r.club_id === clubId);
            const row = prefRow({
                user_id: userId,
                club_id: clubId,
                ...values,
                updated_at: NOW.toISOString(),
            });
            if (existing) {
                Object.assign(existing, row);
                return existing;
            }
            rows.push(row);
            return row;
        },
    };
}

function signal(overrides: Partial<MemberSignal> = {}): MemberSignal {
    return {
        id: 'sig-1',
        club_id: 'club-1',
        user_id: 'user-1',
        signal_type: 'posted',
        payload: { tags: ['musica'] },
        created_at: NOW.toISOString(),
        ...overrides,
    };
}

describe('member AI preferences', () => {
    test('defaults are opt-IN (personalization + proactive messages allowed)', () => {
        expect(DEFAULT_MEMBER_PREFERENCES).toEqual({
            allowPersonalization: true,
            allowProactiveMessages: true,
        });
    });

    test('getMemberPreferences returns defaults when the member never set them', async () => {
        const prefs = await getMemberPreferences('user-1', 'club-1', {
            db: stubPrefsDb(),
        });
        expect(prefs).toEqual(DEFAULT_MEMBER_PREFERENCES);
    });

    test('setMemberPreferences persists and returns the new values', async () => {
        const db = stubPrefsDb();
        const saved = await setMemberPreferences('user-1', 'club-1', {
            allowPersonalization: false,
            allowProactiveMessages: false,
        }, { db });
        expect(saved.allowPersonalization).toBe(false);
        expect(saved.allowProactiveMessages).toBe(false);

        const reloaded = await getMemberPreferences('user-1', 'club-1', { db });
        expect(reloaded).toEqual(saved);
    });

    test('setMemberPreferences accepts partial updates', async () => {
        const db = stubPrefsDb();
        const saved = await setMemberPreferences('user-1', 'club-1', {
            allowPersonalization: false,
        }, { db });
        expect(saved.allowPersonalization).toBe(false);
        expect(saved.allowProactiveMessages).toBe(true);
    });

    test('setMemberPreferences rejects non-boolean values', async () => {
        await expect(
            setMemberPreferences('user-1', 'club-1', {
                allowPersonalization: 'yes' as unknown as boolean,
            }, { db: stubPrefsDb() }),
        ).rejects.toThrow();
    });

    test('shouldSkipPersonalization / shouldSkipProactiveSend', () => {
        expect(shouldSkipPersonalization({ ...DEFAULT_MEMBER_PREFERENCES, allowPersonalization: false })).toBe(true);
        expect(shouldSkipPersonalization(DEFAULT_MEMBER_PREFERENCES)).toBe(false);
        expect(shouldSkipProactiveSend({ ...DEFAULT_MEMBER_PREFERENCES, allowProactiveMessages: false })).toBe(true);
        expect(shouldSkipProactiveSend(DEFAULT_MEMBER_PREFERENCES)).toBe(false);
    });
});

describe('personalization opt-out', () => {
    test('allowPersonalization=false -> getMemberProfileWithConsent returns an empty profile', async () => {
        const db = stubPrefsDb([
            prefRow({ allow_personalization: false }),
        ]);
        const profile: MemberProfile = await getMemberProfileWithConsent('club-1', 'user-1', {
            prefs: { db },
            signals: {
                db: {
                    insertSignal: async () => signal(),
                    listSignals: async () => [signal(), signal({ id: 'sig-2', payload: { tags: ['deporte'] } })],
                },
            },
        });
        expect(profile.signalCount).toBe(0);
        expect(profile.interests).toEqual([]);
        expect(profile.milestones).toEqual([]);
        expect(profile.lastActive).toBeNull();
    });

    test('allowPersonalization=true -> real profile from signals', async () => {
        const db = stubPrefsDb();
        const profile = await getMemberProfileWithConsent('club-1', 'user-1', {
            prefs: { db },
            signals: {
                db: {
                    insertSignal: async () => signal(),
                    listSignals: async () => [signal(), signal({ id: 'sig-2', payload: { tags: ['musica'] } })],
                },
            },
        });
        expect(profile.signalCount).toBe(2);
        expect(profile.interests).toEqual([{ tag: 'musica', count: 2 }]);
    });
});

// ---------------------------------------------------------------------------
// Audit log (read-only — rows are written by the verify pipeline)
// ---------------------------------------------------------------------------

function actionRow(overrides: Partial<AiAction> = {}): AiAction {
    return {
        id: 'act-1',
        club_id: 'club-1',
        agent_id: 'community-manager',
        action: 'send_message',
        inputs: { recipientId: 'user-1' },
        idempotency_key: 'key-1',
        status: 'executed',
        policy_result: null,
        review_result: null,
        execution_result: null,
        created_at: NOW.toISOString(),
        ...overrides,
    };
}

function stubAuditDb(initial: AiAction[] = []): AuditDb {
    const rows = [...initial];
    return {
        async listActions(clubId: string, limit = 100) {
            return rows
                .filter((r) => r.club_id === clubId)
                .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
                .slice(0, limit);
        },
    };
}

describe('ai_actions audit log', () => {
    test('listAiActions returns the club audit log, club-scoped', async () => {
        const db = stubAuditDb([
            actionRow(),
            actionRow({ id: 'act-2', club_id: 'club-2' }),
        ]);
        const actions = await listAiActions('club-1', { db });
        expect(actions).toHaveLength(1);
        expect(actions[0].club_id).toBe('club-1');
        expect(actions[0].agent_id).toBe('community-manager');
        expect(actions[0].action).toBe('send_message');
    });

    test('listAiActions sanitizes PII out of inputs on read', async () => {
        const db = stubAuditDb([
            actionRow({
                inputs: { body: 'Hola, escríbeme a juan@example.com o al +53 5555 1234' },
            }),
        ]);
        const actions = await listAiActions('club-1', { db });
        const body = String(actions[0].inputs['body']);
        expect(body).not.toContain('juan@example.com');
        expect(body).not.toContain('5555');
        expect(body).toContain('[redacted-email]');
        expect(body).toContain('[redacted-phone]');
    });

    test('listAiActions requires a non-empty clubId', async () => {
        await expect(listAiActions('', { db: stubAuditDb() })).rejects.toThrow();
    });
});
