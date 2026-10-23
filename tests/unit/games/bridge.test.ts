/**
 * Bridge protocol tests (Workstream B). The composed playable document is
 * the runtime security boundary: strict CSP meta (no network at all),
 * trusted SDK injected by the platform (never part of the validated
 * artifact), session id baked in so every bridge call is attributable.
 */
import {
    BRIDGE_NAMESPACE,
    bridgeErrorResponse,
    bridgeOkResponse,
    composePlayableHtml,
    GAME_CSP,
    isBridgeRequest,
    type BridgeRequest,
} from '@/lib/games/bridge';

const GAME = '<!DOCTYPE html><html><head><title>Quiz</title></head><body><h1>Quiz</h1></body></html>';

describe('bridge envelopes', () => {
    it('recognizes only well-formed bridge requests', () => {
        const req: BridgeRequest = {
            ns: BRIDGE_NAMESPACE,
            v: 1,
            kind: 'request',
            id: 'r1',
            sessionId: 's1',
            method: 'submitScore',
            params: { score: 10 },
        };
        expect(isBridgeRequest(req)).toBe(true);
        expect(isBridgeRequest({ ...req, ns: 'OPEN_WIDGET' })).toBe(false);
        expect(isBridgeRequest({ ...req, v: 2 })).toBe(false);
        expect(isBridgeRequest(null)).toBe(false);
        expect(isBridgeRequest('x')).toBe(false);
    });

    it('builds ok/error responses echoing the request id', () => {
        const req: BridgeRequest = {
            ns: BRIDGE_NAMESPACE,
            v: 1,
            kind: 'request',
            id: 'r9',
            sessionId: 's1',
            method: 'member',
        };
        expect(bridgeOkResponse(req, { name: 'Ana' })).toMatchObject({
            kind: 'response',
            id: 'r9',
            ok: true,
            result: { name: 'Ana' },
        });
        expect(bridgeErrorResponse(req, 'CAPABILITY_NOT_DECLARED', 'no')).toMatchObject({
            kind: 'response',
            id: 'r9',
            ok: false,
            error: { code: 'CAPABILITY_NOT_DECLARED' },
        });
    });
});

describe('composePlayableHtml', () => {
    it('injects the CSP meta and the trusted SDK into the head', () => {
        const out = composePlayableHtml(GAME, { sessionId: 'sess-1' });
        expect(out).toContain('Content-Security-Policy');
        expect(out).toContain(GAME_CSP);
        expect(out).toContain('window.ClubGame');
        expect(out).toContain('sess-1');
        // The game content survives intact.
        expect(out).toContain('<h1>Quiz</h1>');
    });

    it('the CSP forbids all network access', () => {
        expect(GAME_CSP).toContain("default-src 'none'");
        expect(GAME_CSP).toContain("connect-src 'none'");
        expect(GAME_CSP).toContain("form-action 'none'");
    });

    it('wraps bare fragments in a full document shell', () => {
        const out = composePlayableHtml('<p>hola</p><script>ClubGame.member()</script>', {
            sessionId: 's2',
        });
        expect(out.toLowerCase()).toContain('<!doctype html>');
        expect(out).toContain('window.ClubGame');
        expect(out).toContain('<p>hola</p>');
    });

    it('the injected SDK only talks through the bridge namespace', () => {
        const out = composePlayableHtml(GAME, { sessionId: 's3' });
        expect(out).toContain(BRIDGE_NAMESPACE);
        // The SDK exposes exactly the bridged methods.
        for (const m of ['member', 'awardPoints', 'submitScore', 'leaderboard', 'getState', 'setState', 'event', 'unlock', 'outcome']) {
            expect(out).toContain(m);
        }
    });
});
