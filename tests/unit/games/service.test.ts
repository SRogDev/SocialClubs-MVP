/**
 * Game service + bridge dispatch tests (Workstream B, plan Phase 68
 * adversarial set). "Games propose, server disposes": every abuse a
 * malicious generated game could attempt — unlimited points, score
 * forgery, double-award on retry, reading another club's/member's state,
 * undeclared capabilities, expired sessions — must fail here.
 */
import {
    createGameService,
    createInMemoryGameDb,
    type GameServiceDeps,
    type MemberContext,
} from '@/lib/games/service';
import { validBrief } from './validate.test';

const CLUB = 'club-1';
const ALICE = 'user-alice';
const BOB = 'user-bob';
const OUTSIDER = 'user-outsider';

const MEMBERS: Record<string, MemberContext> = {
    [ALICE]: { id: ALICE, displayName: 'Alicia', avatarUrl: null, role: 'member', points: 10 },
    [BOB]: { id: BOB, displayName: 'Beto', avatarUrl: null, role: 'member', points: 5 },
};

function makeService(nowRef: { now: Date }) {
    const db = createInMemoryGameDb();
    const grants: Array<{ userId: string; points: number }> = [];
    const signals: Array<{ memberId: string; type: string }> = [];
    const deps: GameServiceDeps = {
        db,
        async grantPoints(input) {
            grants.push({ userId: input.userId, points: input.points });
        },
        async memberContext(userId, clubId) {
            if (clubId !== CLUB) return null;
            return MEMBERS[userId] ?? null;
        },
        async eventContext(clubId, eventId) {
            if (clubId !== CLUB) return null;
            return { id: eventId, title: 'Noche de trivia', phase: 'live' };
        },
        async recordOutcomeSignal(input) {
            signals.push({ memberId: input.memberId, type: input.type });
        },
        now: () => nowRef.now,
    };
    return { service: createGameService(deps), db, grants, signals };
}

async function publishedGame(
    service: ReturnType<typeof makeService>['service'],
    briefOverrides: Parameters<typeof validBrief>[0] = {},
) {
    const brief = validBrief({
        capabilities: [
            'member.profile',
            'leaderboard',
            'points.award',
            'outcomes',
            'game.state',
            'unlocks',
            'event.context',
        ],
        ...briefOverrides,
    });
    const draft = await service.createDraft({
        clubId: CLUB,
        prompt: 'Un quiz',
        brief,
        html: '<html></html>',
        validation: { ok: true, violations: [], usedCapabilities: brief.capabilities, sizeBytes: 10 },
        mock: false,
        createdBy: ALICE,
    });
    return service.reviewGame(draft.id, 'approve');
}

describe('library lifecycle', () => {
    it('approve publishes only validated drafts; reject closes the draft', async () => {
        const { service } = makeService({ now: new Date() });
        const bad = await service.createDraft({
            clubId: CLUB,
            prompt: 'x',
            brief: validBrief(),
            html: '<html></html>',
            validation: { ok: false, violations: [{ rule: 'no_network', detail: 'fetch' }], usedCapabilities: [], sizeBytes: 5 },
            mock: false,
            createdBy: ALICE,
        });
        await expect(service.reviewGame(bad.id, 'approve')).rejects.toThrow(/failed validation/);
        const rejected = await service.reviewGame(bad.id, 'reject');
        expect(rejected.status).toBe('rejected');
    });

    it('only club members can start a play session', async () => {
        const { service } = makeService({ now: new Date() });
        const game = await publishedGame(service);
        await expect(
            service.startSession({ gameId: game.id, userId: OUTSIDER, kind: 'play' }),
        ).rejects.toThrow(/members/);
        const { session } = await service.startSession({ gameId: game.id, userId: ALICE, kind: 'play' });
        expect(session.clubId).toBe(CLUB);
    });
});

describe('bridge dispatch', () => {
    it('member returns the session member context', async () => {
        const { service } = makeService({ now: new Date() });
        const game = await publishedGame(service);
        const { session } = await service.startSession({ gameId: game.id, userId: ALICE, kind: 'play' });
        const res = await service.handleBridgeCall({ sessionId: session.id, method: 'member' });
        expect(res).toMatchObject({ ok: true, result: { displayName: 'Alicia' } });
    });

    it('rejects calls to undeclared capabilities', async () => {
        const { service } = makeService({ now: new Date() });
        const game = await publishedGame(service, { capabilities: ['leaderboard'] });
        const { session } = await service.startSession({ gameId: game.id, userId: ALICE, kind: 'play' });
        const res = await service.handleBridgeCall({
            sessionId: session.id,
            method: 'awardPoints',
            params: { amount: 5 },
        });
        expect(res).toMatchObject({ ok: false, code: 'CAPABILITY_NOT_DECLARED' });
    });

    it('rejects calls on expired sessions', async () => {
        const nowRef = { now: new Date('2026-10-23T12:00:00Z') };
        const { service } = makeService(nowRef);
        const game = await publishedGame(service, { sessionMinutes: 5 });
        const { session } = await service.startSession({ gameId: game.id, userId: ALICE, kind: 'play' });
        nowRef.now = new Date('2026-10-23T12:06:00Z');
        const res = await service.handleBridgeCall({ sessionId: session.id, method: 'member' });
        expect(res).toMatchObject({ ok: false, code: 'SESSION_EXPIRED' });
    });

    it('rate-limits a runaway game', async () => {
        const { service } = makeService({ now: new Date() });
        const game = await publishedGame(service);
        const { session } = await service.startSession({ gameId: game.id, userId: ALICE, kind: 'play' });
        let last;
        for (let i = 0; i < 65; i++) {
            last = await service.handleBridgeCall({ sessionId: session.id, method: 'member' });
        }
        expect(last).toMatchObject({ ok: false, code: 'RATE_LIMITED' });
    });
});

describe('scores (anti-cheat)', () => {
    it('accepts scores within the brief cap and rejects forged ones', async () => {
        const { service, db } = makeService({ now: new Date() });
        const game = await publishedGame(service, { maxScore: 600 });
        const { session } = await service.startSession({ gameId: game.id, userId: ALICE, kind: 'play' });
        const ok = await service.handleBridgeCall({
            sessionId: session.id,
            method: 'submitScore',
            params: { score: 600, idempotencyKey: 's1' },
        });
        expect(ok).toMatchObject({ ok: true, result: { accepted: true } });
        const forged = await service.handleBridgeCall({
            sessionId: session.id,
            method: 'submitScore',
            params: { score: 999_999, idempotencyKey: 's2' },
        });
        expect(forged).toMatchObject({ ok: false, code: 'SCORE_OUT_OF_RANGE' });
        expect(db.scores).toHaveLength(1);
    });

    it('a retried submit with the same idempotency key never duplicates', async () => {
        const { service, db } = makeService({ now: new Date() });
        const game = await publishedGame(service);
        const { session } = await service.startSession({ gameId: game.id, userId: ALICE, kind: 'play' });
        await service.handleBridgeCall({
            sessionId: session.id,
            method: 'submitScore',
            params: { score: 100, idempotencyKey: 'retry-me' },
        });
        const retry = await service.handleBridgeCall({
            sessionId: session.id,
            method: 'submitScore',
            params: { score: 100, idempotencyKey: 'retry-me' },
        });
        expect(retry).toMatchObject({ ok: true, result: { duplicate: true } });
        expect(db.scores).toHaveLength(1);
    });

    it('leaderboard shows best score per member, ordered', async () => {
        const { service } = makeService({ now: new Date() });
        const game = await publishedGame(service);
        const a = await service.startSession({ gameId: game.id, userId: ALICE, kind: 'play' });
        const b = await service.startSession({ gameId: game.id, userId: BOB, kind: 'play' });
        await service.handleBridgeCall({ sessionId: a.session.id, method: 'submitScore', params: { score: 100, idempotencyKey: 'a1' } });
        await service.handleBridgeCall({ sessionId: a.session.id, method: 'submitScore', params: { score: 300, idempotencyKey: 'a2' } });
        await service.handleBridgeCall({ sessionId: b.session.id, method: 'submitScore', params: { score: 200, idempotencyKey: 'b1' } });
        const entries = await service.leaderboard(game.id);
        expect(entries.map((e) => [e.displayName, e.score])).toEqual([
            ['Alicia', 300],
            ['Beto', 200],
        ]);
    });
});

describe('points (anti-cheat)', () => {
    it('grants through the port exactly once per idempotency key', async () => {
        const { service, grants } = makeService({ now: new Date() });
        const game = await publishedGame(service, { pointsPerSession: 20 });
        const { session } = await service.startSession({ gameId: game.id, userId: ALICE, kind: 'play' });
        const first = await service.handleBridgeCall({
            sessionId: session.id,
            method: 'awardPoints',
            params: { amount: 20, reason: 'quiz', idempotencyKey: 'award-1' },
        });
        expect(first).toMatchObject({ ok: true, result: { awarded: true } });
        const retry = await service.handleBridgeCall({
            sessionId: session.id,
            method: 'awardPoints',
            params: { amount: 20, reason: 'quiz', idempotencyKey: 'award-1' },
        });
        expect(retry).toMatchObject({ ok: true, result: { awarded: false, duplicate: true } });
        expect(grants).toEqual([{ userId: ALICE, points: 20 }]);
    });

    it('enforces the per-session points cap across calls', async () => {
        const { service, grants } = makeService({ now: new Date() });
        const game = await publishedGame(service, { pointsPerSession: 20 });
        const { session } = await service.startSession({ gameId: game.id, userId: ALICE, kind: 'play' });
        await service.handleBridgeCall({ sessionId: session.id, method: 'awardPoints', params: { amount: 15, idempotencyKey: 'p1' } });
        const over = await service.handleBridgeCall({
            sessionId: session.id,
            method: 'awardPoints',
            params: { amount: 10, idempotencyKey: 'p2' },
        });
        expect(over).toMatchObject({ ok: false, code: 'POINTS_CAP_EXCEEDED' });
        expect(grants).toHaveLength(1);
    });

    it('rejects a single award above the brief allowance', async () => {
        const { service } = makeService({ now: new Date() });
        const game = await publishedGame(service, { pointsPerSession: 20 });
        const { session } = await service.startSession({ gameId: game.id, userId: ALICE, kind: 'play' });
        const res = await service.handleBridgeCall({
            sessionId: session.id,
            method: 'awardPoints',
            params: { amount: 21, idempotencyKey: 'p9' },
        });
        expect(res).toMatchObject({ ok: false, code: 'POINTS_OUT_OF_RANGE' });
    });
});

describe('state scoping', () => {
    it('member state is private per member and per game', async () => {
        const { service } = makeService({ now: new Date() });
        const game = await publishedGame(service);
        const other = await publishedGame(service);
        const a = await service.startSession({ gameId: game.id, userId: ALICE, kind: 'play' });
        const b = await service.startSession({ gameId: game.id, userId: BOB, kind: 'play' });
        const aOther = await service.startSession({ gameId: other.id, userId: ALICE, kind: 'play' });
        await service.handleBridgeCall({ sessionId: a.session.id, method: 'setState', params: { key: 'nivel', value: 3 } });
        const mine = await service.handleBridgeCall({ sessionId: a.session.id, method: 'getState', params: { key: 'nivel' } });
        expect(mine).toMatchObject({ ok: true, result: { value: 3 } });
        const bobs = await service.handleBridgeCall({ sessionId: b.session.id, method: 'getState', params: { key: 'nivel' } });
        expect(bobs).toMatchObject({ ok: true, result: { value: null } });
        const crossGame = await service.handleBridgeCall({ sessionId: aOther.session.id, method: 'getState', params: { key: 'nivel' } });
        expect(crossGame).toMatchObject({ ok: true, result: { value: null } });
    });

    it('club-scope state is shared inside the club only', async () => {
        const { service } = makeService({ now: new Date() });
        const game = await publishedGame(service);
        const a = await service.startSession({ gameId: game.id, userId: ALICE, kind: 'play' });
        const b = await service.startSession({ gameId: game.id, userId: BOB, kind: 'play' });
        await service.handleBridgeCall({ sessionId: a.session.id, method: 'setState', params: { key: 'marcador', value: 'final', scope: 'club' } });
        const read = await service.handleBridgeCall({ sessionId: b.session.id, method: 'getState', params: { key: 'marcador', scope: 'club' } });
        expect(read).toMatchObject({ ok: true, result: { value: 'final' } });
    });

    it('rejects oversize state values', async () => {
        const { service } = makeService({ now: new Date() });
        const game = await publishedGame(service);
        const { session } = await service.startSession({ gameId: game.id, userId: ALICE, kind: 'play' });
        const res = await service.handleBridgeCall({
            sessionId: session.id,
            method: 'setState',
            params: { key: 'big', value: 'x'.repeat(9000) },
        });
        expect(res).toMatchObject({ ok: false, code: 'STATE_TOO_LARGE' });
    });
});

describe('unlocks, outcomes, events, preview', () => {
    it('unlock grants a temporary unlock visible to the member', async () => {
        const { service } = makeService({ now: new Date() });
        const game = await publishedGame(service);
        const { session } = await service.startSession({ gameId: game.id, userId: ALICE, kind: 'play' });
        const res = await service.handleBridgeCall({
            sessionId: session.id,
            method: 'unlock',
            params: { grant: 'content:post-secreto', ttlMinutes: 30 },
        });
        expect(res).toMatchObject({ ok: true, result: { unlocked: true } });
        const unlocks = await service.listUnlocks(CLUB, ALICE);
        expect(unlocks.map((u) => u.grantKey)).toEqual(['content:post-secreto']);
    });

    it('outcomes are recorded and mirrored as signals; invalid types rejected', async () => {
        const { service, db, signals } = makeService({ now: new Date() });
        const game = await publishedGame(service);
        const { session } = await service.startSession({ gameId: game.id, userId: ALICE, kind: 'play' });
        const ok = await service.handleBridgeCall({
            sessionId: session.id,
            method: 'outcome',
            params: { type: 'member_completed', payload: { score: 10 } },
        });
        expect(ok).toMatchObject({ ok: true });
        expect(db.outcomes.map((o) => o.type)).toContain('member_completed');
        expect(signals).toContainEqual({ memberId: ALICE, type: 'member_completed' });
        const bad = await service.handleBridgeCall({
            sessionId: session.id,
            method: 'outcome',
            params: { type: 'hacked_the_planet', payload: {} },
        });
        expect(bad).toMatchObject({ ok: false, code: 'INVALID_OUTCOME' });
    });

    it('event context resolves for event-attached games only', async () => {
        const { service } = makeService({ now: new Date() });
        const game = await publishedGame(service);
        const attached = await service.attachGame(game.id, { eventId: 'event-9' });
        const { session } = await service.startSession({ gameId: attached.id, userId: ALICE, kind: 'play' });
        const res = await service.handleBridgeCall({ sessionId: session.id, method: 'event' });
        expect(res).toMatchObject({ ok: true, result: { title: 'Noche de trivia', phase: 'live' } });

        const plain = await publishedGame(service);
        const s2 = await service.startSession({ gameId: plain.id, userId: ALICE, kind: 'play' });
        const noEvent = await service.handleBridgeCall({ sessionId: s2.session.id, method: 'event' });
        expect(noEvent).toMatchObject({ ok: false, code: 'NO_EVENT_CONTEXT' });
    });

    it('preview sessions simulate effects without persisting anything', async () => {
        const { service, db, grants } = makeService({ now: new Date() });
        const game = await publishedGame(service);
        const { session } = await service.startSession({ gameId: game.id, userId: ALICE, kind: 'preview' });
        const score = await service.handleBridgeCall({
            sessionId: session.id,
            method: 'submitScore',
            params: { score: 100, idempotencyKey: 'pv1' },
        });
        expect(score).toMatchObject({ ok: true, result: { preview: true } });
        const award = await service.handleBridgeCall({
            sessionId: session.id,
            method: 'awardPoints',
            params: { amount: 10, idempotencyKey: 'pv2' },
        });
        expect(award).toMatchObject({ ok: true, result: { preview: true } });
        expect(db.scores).toHaveLength(0);
        expect(grants).toHaveLength(0);
    });
});
