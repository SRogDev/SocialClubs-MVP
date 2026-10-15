import { resolveActionMode } from '@/lib/ai/proactivity';

describe('proactivity permission matrix (ADR-002 §2)', () => {
    test.each([
        ['low', 1, 'draft'],
        ['low', 2, 'auto'],
        ['low', 3, 'auto'],
        ['medium', 1, 'draft'],
        ['medium', 2, 'approval'],
        ['medium', 3, 'auto'],
        ['high', 1, 'approval'],
        ['high', 2, 'approval'],
        ['high', 3, 'approval'],
        ['critical', 1, 'approval'],
        ['critical', 2, 'approval'],
        ['critical', 3, 'approval'],
    ] as const)('risk=%s level=%s -> %s', (risk, level, expected) => {
        expect(resolveActionMode('any_action', risk, level)).toBe(expected);
    });

    test('escalate_to_human is always executable (never stuck in draft)', () => {
        expect(resolveActionMode('escalate_to_human', 'low', 1)).toBe('auto');
    });

    test('throws on invalid proactivity levels', () => {
        expect(() => resolveActionMode('send_message', 'low', 0)).toThrow();
        expect(() => resolveActionMode('send_message', 'low', 4)).toThrow();
    });
});
