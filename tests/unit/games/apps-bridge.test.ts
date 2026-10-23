/**
 * Connected apps through the club bridge (Workstream C2 acceptance)
 * + widget profile rules (C1). The game service is wired to the REAL
 * guarded executor with a fake provider and in-memory bindings:
 * - declared + approved read actions execute with the CLUB's binding;
 * - undeclared actions are rejected before the executor runs;
 * - writes surface as pending_approval (the game is told, nothing runs);
 * - without a configured executor, calls answer APPS_NOT_CONFIGURED;
 * - widget-profile artifacts play by widget rules (no points/scores,
 *   per-render sessions that don't expire).
 */
import { createInMemoryConnectionStore } from '@/lib/integrations/connections';
import { createExternalExecutor } from '@/lib/integrations/executor';
import { FakeExternalProvider } from '@/lib/integrations/fake';
import { entityIdForUser } from '@/lib/integrations/types';
import type { GameBrief } from '@/lib/games/brief';
import {
    createGameService,
    createInMemoryGameDb,
    type GameServiceDeps,
    type MemberContext,
} from '@/lib/games/service';
import { validBrief } from './validate.test';

const CLUB = 'club-apps';
const CREATOR = 'creator-1';
const PLAYER = 'player-1';
const YT_READ = 'ext.youtube.YOUTUBE_GET_CHANNEL_STATISTICS';
const YT_WRITE = 'ext.youtube.YOUTUBE_CREATE_PLAYLIST';

function memberContext(userId: string): Promise<MemberContext | null> {
    return Promise.resolve({
        id: userId,
        displayName: 'Miembro',
        avatarUrl: null,
        role: 'member',
        points: 0,
    });
}

async function setup(withExecutor: boolean) {
    const db = createInMemoryGameDb();
    const provider = new FakeExternalProvider();
    const connections = createInMemoryConnectionStore();
    const link = await provider.createConnectLink({
        entityId: entityIdForUser(CREATOR),
        toolkitSlug: 'youtube',
        callbackUrl: 'https://app.test/cb',
    });
    await connections.upsertBinding({
        clubId: CLUB,
        creatorUserId: CREATOR,
        toolkitSlug: 'youtube',
        connectedAccountId: link.connectionId,
    });
    const executor = createExternalExecutor({
        provider,
        connections,
        async requestApproval() {
            return 'inbox-42';
        },
    });
    const deps: GameServiceDeps = {
        db,
        async grantPoints() {},
        memberContext,
        async eventContext() {
            return null;
        },
        ...(withExecutor ? { external: executor } : {}),
    };
    return { service: createGameService(deps), provider };
}

async function publishedArtifact(
    service: ReturnType<typeof createGameService>,
    briefOverrides: Partial<GameBrief>,
) {
    const brief = validBrief({
        capabilities: ['apps.invoke', 'leaderboard', 'points.award', 'outcomes'],
        externalActions: [YT_READ, YT_WRITE],
        ...briefOverrides,
    });
    const draft = await service.createDraft({
        clubId: CLUB,
        prompt: 'Artefacto con apps',
        brief,
        html: '<html></html>',
        validation: { ok: true, violations: [], usedCapabilities: brief.capabilities, sizeBytes: 10 },
        mock: false,
        createdBy: CREATOR,
    });
    return service.reviewGame(draft.id, 'approve');
}

describe('bridge app calls', () => {
    it('a declared read action executes through the club binding', async () => {
        const { service, provider } = await setup(true);
        const game = await publishedArtifact(service, {});
        const { session } = await service.startSession({ gameId: game.id, userId: PLAYER, kind: 'play' });
        const res = await service.handleBridgeCall({
            sessionId: session.id,
            method: 'app',
            params: { actionId: YT_READ, arguments: {} },
        });
        expect(res).toMatchObject({ ok: true, result: { status: 'executed' } });
        expect(provider.executions).toHaveLength(1);
        expect(provider.executions[0].entityId).toBe('sc-user-creator-1');
    });

    it('an undeclared action is rejected before reaching the provider', async () => {
        const { service, provider } = await setup(true);
        const game = await publishedArtifact(service, { externalActions: [YT_READ] });
        const { session } = await service.startSession({ gameId: game.id, userId: PLAYER, kind: 'play' });
        const res = await service.handleBridgeCall({
            sessionId: session.id,
            method: 'app',
            params: { actionId: YT_WRITE, arguments: { title: 'x' } },
        });
        expect(res).toMatchObject({ ok: false, code: 'ACTION_NOT_DECLARED' });
        expect(provider.executions).toHaveLength(0);
    });

    it('a declared write surfaces pending_approval; nothing executes', async () => {
        const { service, provider } = await setup(true);
        const game = await publishedArtifact(service, {});
        const { session } = await service.startSession({ gameId: game.id, userId: PLAYER, kind: 'play' });
        const res = await service.handleBridgeCall({
            sessionId: session.id,
            method: 'app',
            params: { actionId: YT_WRITE, arguments: { title: 'Lista' } },
        });
        expect(res).toMatchObject({
            ok: true,
            result: { status: 'pending_approval', inboxItemId: 'inbox-42' },
        });
        expect(provider.executions).toHaveLength(0);
    });

    it('without the apps.invoke capability the method itself is rejected', async () => {
        const { service } = await setup(true);
        const game = await publishedArtifact(service, { capabilities: ['leaderboard'] });
        const { session } = await service.startSession({ gameId: game.id, userId: PLAYER, kind: 'play' });
        const res = await service.handleBridgeCall({
            sessionId: session.id,
            method: 'app',
            params: { actionId: YT_READ, arguments: {} },
        });
        expect(res).toMatchObject({ ok: false, code: 'CAPABILITY_NOT_DECLARED' });
    });

    it('without a configured executor the call degrades honestly', async () => {
        const { service } = await setup(false);
        const game = await publishedArtifact(service, {});
        const { session } = await service.startSession({ gameId: game.id, userId: PLAYER, kind: 'play' });
        const res = await service.handleBridgeCall({
            sessionId: session.id,
            method: 'app',
            params: { actionId: YT_READ, arguments: {} },
        });
        expect(res).toMatchObject({ ok: false, code: 'APPS_NOT_CONFIGURED' });
    });
});

describe('widget profile (C1)', () => {
    it('widget sessions render, never expire, and cannot award points or scores', async () => {
        const { service } = await setup(true);
        const widget = await publishedArtifact(service, { profile: 'widget' });
        const { session } = await service.startSession({
            gameId: widget.id,
            userId: PLAYER,
            kind: 'widget',
        });
        const points = await service.handleBridgeCall({
            sessionId: session.id,
            method: 'awardPoints',
            params: { amount: 5, idempotencyKey: 'w1' },
        });
        expect(points).toMatchObject({ ok: false, code: 'PROFILE_FORBIDDEN' });
        const app = await service.handleBridgeCall({
            sessionId: session.id,
            method: 'app',
            params: { actionId: YT_READ, arguments: {} },
        });
        expect(app).toMatchObject({ ok: true, result: { status: 'executed' } });
    });

    it('game-profile artifacts cannot start widget sessions', async () => {
        const { service } = await setup(true);
        const game = await publishedArtifact(service, {});
        await expect(
            service.startSession({ gameId: game.id, userId: PLAYER, kind: 'widget' }),
        ).rejects.toThrow(/widget-profile/);
    });
});
