/**
 * Workflow action registry entries (master plan Phases 41-45).
 *
 * The six community-automation actions must be registered with honest risk
 * ratings — the proactivity matrix turns those ratings into the workflow
 * contract (L1 drafts everything, L2 auto-sends low-risk, L3 auto-sends
 * low+medium). A wrong risk rating silently changes what the AI may do
 * unsupervised, so it is pinned here.
 */
import { ACTION_REGISTRY, getAction } from '@/lib/ai/actions';

describe('workflow actions are registered', () => {
    const expected = [
        'send_welcome',
        'send_checkin',
        'post_digest',
        'notify_inactive',
        'grant_points',
        'enroll_challenge',
    ];

    test.each(expected)('%s is in the registry', (name) => {
        expect(() => getAction(name)).not.toThrow();
        expect(ACTION_REGISTRY[name].name).toBe(name);
    });

    test('getAction still denies unknown actions', () => {
        expect(() => getAction('nope')).toThrow(/unknown AI action/i);
    });
});

describe('workflow action risk ratings (pinned)', () => {
    test('low risk: single-member or deterministic content', () => {
        expect(getAction('send_welcome').risk).toBe('low');
        expect(getAction('send_checkin').risk).toBe('low');
        expect(getAction('post_digest').risk).toBe('low');
    });

    test('medium risk: multi-member reach or value transfer', () => {
        expect(getAction('notify_inactive').risk).toBe('medium');
        expect(getAction('grant_points').risk).toBe('medium');
        expect(getAction('enroll_challenge').risk).toBe('medium');
    });

    test('every workflow action is idempotent and audited', () => {
        for (const name of [
            'send_welcome',
            'send_checkin',
            'post_digest',
            'notify_inactive',
            'grant_points',
            'enroll_challenge',
        ]) {
            const def = getAction(name);
            expect(def.idempotent).toBe(true);
            expect(def.audit).toBe(true);
        }
    });
});

describe('workflow action input schemas', () => {
    test('send_welcome requires recipientId and body', () => {
        const def = getAction('send_welcome');
        expect(def.inputSchema.safeParse({ recipientId: 'u', body: 'hi' }).success).toBe(true);
        expect(def.inputSchema.safeParse({ body: 'hi' }).success).toBe(false);
        expect(def.inputSchema.safeParse({ recipientId: 'u', body: '' }).success).toBe(false);
    });

    test('grant_points bounds the incentive', () => {
        const def = getAction('grant_points');
        expect(
            def.inputSchema.safeParse({ userId: 'u', points: 10, reason: 'r' }).success,
        ).toBe(true);
        expect(
            def.inputSchema.safeParse({ userId: 'u', points: 0, reason: 'r' }).success,
        ).toBe(false);
        expect(
            def.inputSchema.safeParse({ userId: 'u', points: 101, reason: 'r' }).success,
        ).toBe(false);
    });

    test('notify_inactive caps the recipient list', () => {
        const def = getAction('notify_inactive');
        const ok = def.inputSchema.safeParse({
            userIds: ['a', 'b'],
            body: 'news',
        });
        expect(ok.success).toBe(true);
        const tooMany = def.inputSchema.safeParse({
            userIds: Array.from({ length: 51 }, (_, i) => `u${i}`),
            body: 'news',
        });
        expect(tooMany.success).toBe(false);
    });

    test('each workflow action declares the permission the agent must hold', () => {
        const pairs: Array<[string, string]> = [
            ['send_welcome', 'send_welcome'],
            ['send_checkin', 'send_checkin'],
            ['post_digest', 'post_digest'],
            ['notify_inactive', 'notify_inactive'],
            ['grant_points', 'grant_points'],
            ['enroll_challenge', 'enroll_challenge'],
        ];
        for (const [action, permission] of pairs) {
            expect(getAction(action).permissions).toContain(permission);
        }
    });
});
