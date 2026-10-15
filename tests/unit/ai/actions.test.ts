import { z } from 'zod';

import { ACTION_REGISTRY, getAction } from '@/lib/ai/actions';

const EXPECTED_ACTIONS = [
    'send_message',
    'create_post',
    'comment_post',
    'tag_post',
    'hide_post',
    'notify_creator',
    'create_event',
    'grant_temporary_access',
    'escalate_to_human',
    'pause_agent',
    // Community automation workflows (master plan Phases 41-45)
    'send_welcome',
    'send_checkin',
    'post_digest',
    'notify_inactive',
    'grant_points',
    'enroll_challenge',
] as const;

const RISKS = ['low', 'medium', 'high', 'critical'] as const;

describe('AI action registry (ADR-002 §1)', () => {
    test('contains exactly the 16 registered actions (10 v1 + 6 workflow)', () => {
        expect(Object.keys(ACTION_REGISTRY).sort()).toEqual([...EXPECTED_ACTIONS].sort());
    });

    test('every action declares risk, permissions, schemas, flags and an executor', () => {
        for (const name of EXPECTED_ACTIONS) {
            const def = getAction(name);
            expect(def.name).toBe(name);
            expect(RISKS).toContain(def.risk);
            expect(Array.isArray(def.permissions)).toBe(true);
            expect(def.permissions.length).toBeGreaterThan(0);
            expect(def.inputSchema).toBeInstanceOf(z.ZodType);
            expect(def.outputSchema).toBeInstanceOf(z.ZodType);
            expect(typeof def.idempotent).toBe('boolean');
            expect(typeof def.audit).toBe('boolean');
            expect(typeof def.execute).toBe('function');
        }
    });

    test('audit is always true for medium+ risk actions', () => {
        for (const name of EXPECTED_ACTIONS) {
            const def = getAction(name);
            if (def.risk !== 'low') {
                expect(def.audit).toBe(true);
            }
        }
    });

    test('critical risk is reserved (no v1 action touches membership/payment)', () => {
        for (const name of EXPECTED_ACTIONS) {
            expect(getAction(name).risk).not.toBe('critical');
        }
    });

    test('getAction throws on unknown action names', () => {
        expect(() => getAction('delete_club')).toThrow();
        expect(() => getAction('')).toThrow();
    });

    test('action input schemas reject malformed payloads', () => {
        const def = getAction('send_message');
        expect(def.inputSchema.safeParse({}).success).toBe(false);
        expect(
            def.inputSchema.safeParse({ recipientId: 'u1', body: 'hello' }).success,
        ).toBe(true);
    });
});
