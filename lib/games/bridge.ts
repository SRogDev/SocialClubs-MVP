/**
 * The Club Bridge (Workstream B — the differentiator).
 *
 * Games are AI-generated free code running in a sandboxed iframe. They
 * NEVER touch the app, the DB, the network, or secrets. Their ONLY
 * channel to the club is this bridge:
 *
 *   game code → window.ClubGame.* (trusted SDK injected by the platform)
 *             → postMessage envelope { ns: 'SC_GAME_BRIDGE', v: 1 }
 *             → host page (GamePlayer) checks event.source === iframe
 *             → POST /api/games/[id]/bridge (authenticated session)
 *             → lib/games/service.ts (capability checks, caps, audit)
 *
 * Runtime enforcement layers (in addition to validate.ts static checks):
 * - iframe `sandbox="allow-scripts"` (opaque origin, no same-origin DOM);
 * - the CSP below in the composed document: default-src 'none' and
 *   connect-src 'none' make network calls impossible even if a static
 *   check missed one; form-action 'none' blocks form exfiltration.
 *
 * The SDK is platform code, injected at play time by composePlayableHtml
 * — it is NOT part of the validated artifact and never counted in the
 * game's size. Sandbox-provider abstraction: today the provider is this
 * iframe composer ('iframe'); a Vercel Sandbox provider could serve
 * server-side game logic later behind the same protocol.
 */

export const BRIDGE_NAMESPACE = 'SC_GAME_BRIDGE';
export const BRIDGE_VERSION = 1;

export const BRIDGE_METHODS = [
    'member',
    'awardPoints',
    'submitScore',
    'leaderboard',
    'getState',
    'setState',
    'event',
    'unlock',
    'outcome',
] as const;
export type BridgeMethod = (typeof BRIDGE_METHODS)[number];

export interface BridgeRequest {
    ns: typeof BRIDGE_NAMESPACE;
    v: typeof BRIDGE_VERSION;
    kind: 'request';
    id: string;
    sessionId: string;
    method: BridgeMethod;
    params?: Record<string, unknown>;
}

export interface BridgeResponse {
    ns: typeof BRIDGE_NAMESPACE;
    v: typeof BRIDGE_VERSION;
    kind: 'response';
    id: string;
    ok: boolean;
    result?: unknown;
    error?: { code: string; message: string };
}

export function isBridgeRequest(value: unknown): value is BridgeRequest {
    if (!value || typeof value !== 'object') return false;
    const v = value as Record<string, unknown>;
    return (
        v.ns === BRIDGE_NAMESPACE &&
        v.v === BRIDGE_VERSION &&
        v.kind === 'request' &&
        typeof v.id === 'string' &&
        typeof v.sessionId === 'string' &&
        typeof v.method === 'string' &&
        (BRIDGE_METHODS as readonly string[]).includes(v.method)
    );
}

export function bridgeOkResponse(req: BridgeRequest, result: unknown): BridgeResponse {
    return { ns: BRIDGE_NAMESPACE, v: BRIDGE_VERSION, kind: 'response', id: req.id, ok: true, result };
}

export function bridgeErrorResponse(
    req: BridgeRequest,
    code: string,
    message: string,
): BridgeResponse {
    return {
        ns: BRIDGE_NAMESPACE,
        v: BRIDGE_VERSION,
        kind: 'response',
        id: req.id,
        ok: false,
        error: { code, message },
    };
}

/**
 * Content-Security-Policy for the composed game document. Inline scripts
 * and styles are allowed (the game IS inline code); everything else is
 * denied. data:/blob: images and media keep self-contained games
 * expressive without any network.
 */
export const GAME_CSP = [
    "default-src 'none'",
    "script-src 'unsafe-inline'",
    "style-src 'unsafe-inline'",
    'img-src data: blob:',
    'media-src data: blob:',
    'font-src data:',
    "connect-src 'none'",
    "form-action 'none'",
    "base-uri 'none'",
].join('; ');

/**
 * The trusted ClubGame SDK, injected into every composed document.
 * Plain ES2020 (no modules) so it runs before the game code. Each method
 * returns a Promise resolved by the host's bridge response.
 */
export function clubGameSdkSource(sessionId: string): string {
    return `(function () {
  var NS = '${BRIDGE_NAMESPACE}';
  var sessionId = ${JSON.stringify(sessionId)};
  var seq = 0;
  var pending = new Map();
  window.addEventListener('message', function (event) {
    var data = event.data;
    if (!data || data.ns !== NS || data.kind !== 'response') return;
    var entry = pending.get(data.id);
    if (!entry) return;
    pending.delete(data.id);
    if (data.ok) entry.resolve(data.result);
    else entry.reject(new Error((data.error && data.error.code) ? data.error.code + ': ' + data.error.message : 'Bridge error'));
  });
  function call(method, params) {
    return new Promise(function (resolve, reject) {
      var id = 'cb-' + (++seq) + '-' + Math.random().toString(36).slice(2, 9);
      pending.set(id, { resolve: resolve, reject: reject });
      window.parent.postMessage({ ns: NS, v: 1, kind: 'request', id: id, sessionId: sessionId, method: method, params: params || {} }, '*');
    });
  }
  window.ClubGame = {
    member: function () { return call('member', {}); },
    awardPoints: function (amount, reason, idempotencyKey) { return call('awardPoints', { amount: amount, reason: reason, idempotencyKey: idempotencyKey }); },
    submitScore: function (score, idempotencyKey) { return call('submitScore', { score: score, idempotencyKey: idempotencyKey }); },
    leaderboard: function (scope) { return call('leaderboard', { scope: scope }); },
    getState: function (key, scope) { return call('getState', { key: key, scope: scope }); },
    setState: function (key, value, opts) { return call('setState', { key: key, value: value, scope: opts && opts.scope, ttlMinutes: opts && opts.ttlMinutes }); },
    event: function () { return call('event', {}); },
    unlock: function (grant, ttlMinutes) { return call('unlock', { grant: grant, ttlMinutes: ttlMinutes }); },
    outcome: function (type, payload) { return call('outcome', { type: type, payload: payload }); }
  };
})();`;
}

/**
 * Compose the playable document served into the sandboxed iframe:
 * validated game artifact + platform CSP + trusted SDK. Handles full
 * documents (inject into <head>) and bare fragments (wrap in a shell).
 */
export function composePlayableHtml(
    gameHtml: string,
    opts: { sessionId: string },
): string {
    const injection =
        `<meta http-equiv="Content-Security-Policy" content="${GAME_CSP}">` +
        `<meta name="viewport" content="width=device-width, initial-scale=1">` +
        `<script>${clubGameSdkSource(opts.sessionId)}</script>`;

    const headMatch = /<head[^>]*>/i.exec(gameHtml);
    if (headMatch) {
        const at = headMatch.index + headMatch[0].length;
        return gameHtml.slice(0, at) + injection + gameHtml.slice(at);
    }
    const htmlMatch = /<html[^>]*>/i.exec(gameHtml);
    if (htmlMatch) {
        const at = htmlMatch.index + htmlMatch[0].length;
        return gameHtml.slice(0, at) + `<head>${injection}</head>` + gameHtml.slice(at);
    }
    return `<!DOCTYPE html><html><head><meta charset="utf-8">${injection}</head><body>${gameHtml}</body></html>`;
}
