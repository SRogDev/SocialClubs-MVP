import { AGENTS, AGENT_DEFAULT_PROACTIVITY_LEVEL } from '@/lib/ai/agents';
import { ACTION_REGISTRY } from '@/lib/ai/actions';

describe('AI staff agent definitions (ADR-002 §4)', () => {
    test('exports exactly the three staff agents', () => {
        expect(Object.keys(AGENTS).sort()).toEqual([
            'community-manager',
            'creator-copilot',
            'experience-director',
        ]);
    });

    test('all agents start at proactivity level 1', () => {
        expect(AGENT_DEFAULT_PROACTIVITY_LEVEL).toBe(1);
    });

    test('every tool an agent holds exists in the action registry', () => {
        for (const def of Object.values(AGENTS)) {
            for (const tool of def.tools) {
                expect(ACTION_REGISTRY[tool]).toBeDefined();
            }
        }
    });

    test('community-manager is restricted to its mission tools', () => {
        expect(AGENTS['community-manager'].tools.sort()).toEqual(
            [
                'send_message',
                'tag_post',
                'comment_post',
                // Community automation workflows (master plan Phases 41-45)
                'send_welcome',
                'send_checkin',
                'post_digest',
            ].sort(),
        );
        expect(AGENTS['community-manager'].permissions).toEqual(
            expect.arrayContaining(['send_message', 'tag_post', 'comment_post']),
        );
    });

    test('experience-director never auto-executes in v1 (no action tools)', () => {
        expect(AGENTS['experience-director'].tools).toEqual([]);
    });

    test('creator-copilot only notifies (plus read permissions)', () => {
        expect(AGENTS['creator-copilot'].tools).toEqual(['notify_creator']);
        expect(AGENTS['creator-copilot'].permissions).toEqual(
            expect.arrayContaining(['notify_creator']),
        );
    });
});
