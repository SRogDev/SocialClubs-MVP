/**
 * Minigame end-to-end test (Workstream B acceptance flow):
 *
 *   prompt (offline mock AI) → brief → generate → validate → draft →
 *   creator approves → publish → member starts a session → simulated
 *   bridge calls (the exact envelopes a played game sends) → score lands
 *   on the leaderboard → points are granted EXACTLY once despite a retry
 *   → outcomes are emitted for community intelligence.
 */
import { MockAIClient } from '@/lib/ai/mock-client';
import { generateGame } from '@/lib/games/generate';
import {
    createGameService,
    createInMemoryGameDb,
    type GameServiceDeps,
    type MemberContext,
} from '@/lib/games/service';
import { suggestGameForEvent } from '@/lib/games/director';

const CLUB = 'club-e2e';
const CREATOR = 'user-creator';
const PLAYER = 'user-player';

function makeDeps(db: ReturnType<typeof createInMemoryGameDb>, grants: unknown[]) {
    const deps: GameServiceDeps = {
        db,
        async grantPoints(input) {
            grants.push(input);
        },
        async memberContext(userId): Promise<MemberContext | null> {
            if (userId !== PLAYER && userId !== CREATOR) return null;
            return {
                id: userId,
                displayName: userId === PLAYER ? 'Jugadora' : 'Creadora',
                avatarUrl: null,
                role: 'member',
                points: 0,
            };
        },
        async eventContext(_clubId, eventId) {
            return { id: eventId, title: 'Evento', phase: 'live' };
        },
    };
    return deps;
}

describe('minigame e2e', () => {
    it('prompt -> publish -> play -> leaderboard + single points grant + outcomes', async () => {
        const db = createInMemoryGameDb();
        const grants: unknown[] = [];
        const service = createGameService(makeDeps(db, grants));

        // 1-3. Generate offline (mock AI) and store as a draft.
        const generated = await generateGame(
            { clubId: CLUB, prompt: 'Un quiz sobre el club para la comunidad', createdBy: CREATOR },
            { client: new MockAIClient() },
        );
        expect(generated.mock).toBe(true);
        expect(generated.validation.ok).toBe(true);
        const draft = await service.createDraft({
            clubId: CLUB,
            prompt: 'Un quiz sobre el club para la comunidad',
            brief: generated.brief,
            html: generated.html,
            validation: generated.validation,
            mock: generated.mock,
            createdBy: CREATOR,
        });
        expect(draft.status).toBe('draft');

        // 4. Creator approves → published in the club library.
        const published = await service.reviewGame(draft.id, 'approve');
        expect(published.status).toBe('published');
        const library = await service.listLibrary(CLUB, 'published');
        expect(library.map((g) => g.id)).toContain(published.id);

        // 5. Member plays: session + bridge calls as the game sends them.
        const { session } = await service.startSession({
            gameId: published.id,
            userId: PLAYER,
            kind: 'play',
        });
        const me = await service.handleBridgeCall({ sessionId: session.id, method: 'member' });
        expect(me).toMatchObject({ ok: true, result: { displayName: 'Jugadora' } });

        const scored = await service.handleBridgeCall({
            sessionId: session.id,
            method: 'submitScore',
            params: { score: 450, idempotencyKey: 'e2e-score-1' },
        });
        expect(scored).toMatchObject({ ok: true, result: { accepted: true } });

        const award = { amount: 20, reason: 'juego completado', idempotencyKey: 'e2e-award-1' };
        const first = await service.handleBridgeCall({ sessionId: session.id, method: 'awardPoints', params: award });
        const retry = await service.handleBridgeCall({ sessionId: session.id, method: 'awardPoints', params: award });
        expect(first).toMatchObject({ ok: true, result: { awarded: true } });
        expect(retry).toMatchObject({ ok: true, result: { duplicate: true } });
        expect(grants).toHaveLength(1);

        const outcome = await service.handleBridgeCall({
            sessionId: session.id,
            method: 'outcome',
            params: { type: 'member_completed', payload: { score: 450 } },
        });
        expect(outcome).toMatchObject({ ok: true });

        // 6. Results are visible: leaderboard + outcomes recorded.
        const board = await service.leaderboard(published.id);
        expect(board).toHaveLength(1);
        expect(board[0]).toMatchObject({ displayName: 'Jugadora', score: 450 });
        const outcomeTypes = db.outcomes.map((o) => o.type);
        expect(outcomeTypes).toContain('member_scored');
        expect(outcomeTypes).toContain('member_completed');
    });

    it('the Experience Director can author a draft game for an event (never auto-published)', async () => {
        const db = createInMemoryGameDb();
        const grants: unknown[] = [];
        const service = createGameService(makeDeps(db, grants));
        const draft = await suggestGameForEvent(
            {
                clubId: CLUB,
                eventId: 'event-1',
                eventTitle: 'Noche de trivia',
                createdBy: CREATOR,
            },
            { service, generate: { client: new MockAIClient() } },
        );
        expect(draft.status).toBe('draft');
        expect(draft.createdByAgent).toBe('experience-director');
        expect(draft.eventId).toBe('event-1');
        expect(draft.validation?.ok).toBe(true);
    });
});
