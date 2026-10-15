import {
    AI_COMMUNITY_MANAGER,
    AI_STAFF_ENABLED,
    ALL_AI_FLAGS,
} from '@/lib/ai/flags';
import { evaluatePolicy, type ClubAIConfigRow, type PolicyDb } from '@/lib/ai/policy';

let savedEnv: NodeJS.ProcessEnv;

function config(overrides: Partial<ClubAIConfigRow> = {}): ClubAIConfigRow {
    return {
        clubId: 'club-1',
        proactivityLevel: 2,
        enabledAgents: ['community-manager'],
        tone: 'friendly',
        policies: {},
        updatedAt: new Date(0).toISOString(),
        ...overrides,
    };
}

function dbWith(row: ClubAIConfigRow | null): PolicyDb {
    return {
        async getClubAIConfig() {
            return row;
        },
    };
}

beforeEach(() => {
    savedEnv = { ...process.env };
    for (const flag of ALL_AI_FLAGS) delete process.env[flag];
    process.env[AI_STAFF_ENABLED] = '1';
    process.env[AI_COMMUNITY_MANAGER] = '1';
});

afterEach(() => {
    process.env = savedEnv;
});

describe('AI policy evaluation (ADR-002 §2)', () => {
    test('denies unknown actions by default', async () => {
        const res = await evaluatePolicy(
            { clubId: 'club-1', agentId: 'community-manager', action: 'delete_club' },
            { db: dbWith(config()) },
        );
        expect(res.allowed).toBe(false);
        expect(res.reason).toMatch(/unknown/i);
    });

    test('denies unknown agents by default', async () => {
        const res = await evaluatePolicy(
            { clubId: 'club-1', agentId: 'ghost-agent', action: 'tag_post' },
            { db: dbWith(config()) },
        );
        expect(res.allowed).toBe(false);
    });

    test('denies agents not enabled for the club', async () => {
        const res = await evaluatePolicy(
            { clubId: 'club-1', agentId: 'creator-copilot', action: 'notify_creator' },
            { db: dbWith(config({ enabledAgents: ['community-manager'] })) },
        );
        expect(res.allowed).toBe(false);
    });

    test('denies agents disabled by feature flag', async () => {
        delete process.env[AI_COMMUNITY_MANAGER];
        const res = await evaluatePolicy(
            { clubId: 'club-1', agentId: 'community-manager', action: 'tag_post' },
            { db: dbWith(config()) },
        );
        expect(res.allowed).toBe(false);
    });

    test('missing config row falls back to L1 defaults', async () => {
        const res = await evaluatePolicy(
            { clubId: 'club-1', agentId: 'community-manager', action: 'tag_post' },
            { db: dbWith(null) },
        );
        expect(res.allowed).toBe(true);
        expect(res.mode).toBe('draft');
    });

    test('L2 medium-risk action requires approval and review', async () => {
        const res = await evaluatePolicy(
            { clubId: 'club-1', agentId: 'community-manager', action: 'send_message' },
            { db: dbWith(config({ proactivityLevel: 2 })) },
        );
        expect(res.allowed).toBe(true);
        expect(res.mode).toBe('approval');
        expect(res.requiresReview).toBe(true);
    });

    test('L3 low-risk action auto-executes without review', async () => {
        const res = await evaluatePolicy(
            { clubId: 'club-1', agentId: 'community-manager', action: 'tag_post' },
            { db: dbWith(config({ proactivityLevel: 3 })) },
        );
        expect(res.allowed).toBe(true);
        expect(res.mode).toBe('auto');
        expect(res.requiresReview).toBe(false);
    });

    test('high-risk actions always need approval, even at L3', async () => {
        const res = await evaluatePolicy(
            { clubId: 'club-1', agentId: 'community-manager', action: 'grant_temporary_access' },
            { db: dbWith(config({ proactivityLevel: 3 })) },
        );
        expect(res.allowed).toBe(true);
        expect(res.mode).toBe('approval');
        expect(res.requiresReview).toBe(true);
    });
});
