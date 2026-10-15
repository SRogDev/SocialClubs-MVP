import {
    AI_COMMUNITY_MANAGER,
    AI_INBOX,
    AI_STAFF_ENABLED,
    ALL_AI_FLAGS,
    agentFlagFor,
    isAgentEnabled,
    isEnabled,
} from '@/lib/ai/flags';

let savedEnv: NodeJS.ProcessEnv;

beforeEach(() => {
    savedEnv = { ...process.env };
    for (const flag of ALL_AI_FLAGS) {
        delete process.env[flag];
    }
});

afterEach(() => {
    process.env = savedEnv;
});

describe('AI feature flags', () => {
    test('all flags default OFF when env vars are unset', () => {
        for (const flag of ALL_AI_FLAGS) {
            expect(isEnabled(flag)).toBe(false);
        }
    });

    test('isEnabled accepts "1" and "true" (case-insensitive)', () => {
        for (const on of ['1', 'true', 'TRUE', 'True', ' 1 ']) {
            process.env[AI_INBOX] = on;
            expect(isEnabled(AI_INBOX)).toBe(true);
        }
    });

    test('isEnabled rejects unset, empty, "0" and other truthy-looking values', () => {
        for (const off of ['0', '', 'yes', 'on', '2', 'false']) {
            process.env[AI_INBOX] = off;
            expect(isEnabled(AI_INBOX)).toBe(false);
        }
        delete process.env[AI_INBOX];
        expect(isEnabled(AI_INBOX)).toBe(false);
    });

    test('agentFlagFor maps known agent ids to their env flag', () => {
        expect(agentFlagFor('community-manager')).toBe(AI_COMMUNITY_MANAGER);
        expect(agentFlagFor('experience-director')).toBe('AI_EXPERIENCE_DIRECTOR');
        expect(agentFlagFor('creator-copilot')).toBe('AI_CREATOR_COPILOT');
        expect(agentFlagFor('ai-inbox')).toBe('AI_INBOX');
        expect(agentFlagFor('moderation')).toBe('AI_MODERATION');
        expect(agentFlagFor('sentient-ui')).toBe('AI_SENTIENT_UI');
        expect(agentFlagFor('widgets')).toBe('AI_WIDGETS');
    });

    test('agentFlagFor returns null for unknown agent ids', () => {
        expect(agentFlagFor('nope')).toBeNull();
        expect(agentFlagFor('')).toBeNull();
    });

    test('isAgentEnabled requires master flag AND the agent flag', () => {
        process.env[AI_STAFF_ENABLED] = '1';
        process.env[AI_COMMUNITY_MANAGER] = '1';
        expect(isAgentEnabled('community-manager')).toBe(true);

        delete process.env[AI_STAFF_ENABLED];
        expect(isAgentEnabled('community-manager')).toBe(false);

        process.env[AI_STAFF_ENABLED] = '1';
        delete process.env[AI_COMMUNITY_MANAGER];
        expect(isAgentEnabled('community-manager')).toBe(false);
    });

    test('isAgentEnabled is false for unknown agent ids even with master on', () => {
        process.env[AI_STAFF_ENABLED] = '1';
        expect(isAgentEnabled('mystery-agent')).toBe(false);
    });
});
