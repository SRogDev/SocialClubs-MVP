/**
 * Game service (Workstream B) — every state-changing game operation.
 *
 * "Games propose, server disposes." Free AI-generated code runs in a
 * sandbox and can only ASK, through the bridge, for effects:
 *
 * - Scores: validated against the brief's maxScore and the session caps;
 *   stored once per idempotency key (a retried submit never duplicates).
 * - Points: a game may request at most its brief's pointsPerSession in
 *   total, in at most maxPointAwardsPerSession calls, each recorded in
 *   the game_point_awards ledger with a unique idempotency key BEFORE
 *   the grant runs — a retry can never double-award. The grant itself
 *   goes through the existing gamification system ('ai_incentive'
 *   action), which applies the CLUB's configured value (anti-inflation:
 *   the game's number spends against its cap, the club's rule decides
 *   the actual credit).
 * - State: scoped game+club(+member), size/key caps, optional expiry.
 *   Member scope always uses the SESSION's user — a game can never name
 *   another member (anti-spoof).
 * - Unlocks: temporary grants with expiry (ephemeral-state pattern).
 * - Outcomes: Phase 23 types, persisted and mirrored into community
 *   intelligence as 'engaged' signals (source: 'game').
 *
 * Sessions are server-issued and bind (game, club, user, event). A
 * session expires at the brief's sessionMinutes. Preview sessions (for
 * the creator in the studio) simulate effects: reads work, but scores,
 * points and outcomes are NOT persisted.
 *
 * Persistence sits behind GameDb (Supabase adapter + in-memory fake);
 * the same pattern as lib/ai/knowledge.ts and lib/ai/cost.ts.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import type { GameBrief, GameCapability } from './brief';
import { BRIDGE_METHOD_CAPABILITIES, MINIGAME_CONSTRAINTS } from './constraints';
import type { BridgeMethod } from './bridge';
import type { GameValidationReport } from './validate';

// ---------------------------------------------------------------------------
// Rows & ports
// ---------------------------------------------------------------------------

export type GameStatus = 'draft' | 'published' | 'rejected' | 'archived';
export type GameSessionKind = 'play' | 'preview';

export interface GameRow {
    id: string;
    clubId: string;
    eventId: string | null;
    postId: string | null;
    createdBy: string;
    createdByAgent: string | null;
    title: string;
    prompt: string;
    brief: GameBrief;
    html: string;
    capabilities: GameCapability[];
    status: GameStatus;
    validation: GameValidationReport | null;
    mock: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface GameSessionRow {
    id: string;
    gameId: string;
    clubId: string;
    userId: string;
    eventId: string | null;
    kind: GameSessionKind;
    startedAt: string;
    submissions: number;
    awardsUsed: number;
    pointsAwarded: number;
}

export interface ScoreRow {
    id: string;
    gameId: string;
    clubId: string;
    eventId: string | null;
    userId: string;
    sessionId: string;
    score: number;
    createdAt: string;
}

export interface UnlockRow {
    id: string;
    gameId: string;
    clubId: string;
    userId: string;
    grantKey: string;
    expiresAt: string | null;
    createdAt: string;
}

export interface GameDb {
    insertGame(row: Omit<GameRow, 'id' | 'createdAt' | 'updatedAt'>): Promise<GameRow>;
    getGame(id: string): Promise<GameRow | null>;
    updateGame(id: string, patch: Partial<GameRow>): Promise<void>;
    listGames(clubId: string, opts?: { status?: GameStatus }): Promise<GameRow[]>;
    insertSession(row: Omit<GameSessionRow, 'id'>): Promise<GameSessionRow>;
    getSession(id: string): Promise<GameSessionRow | null>;
    updateSession(id: string, patch: Partial<GameSessionRow>): Promise<void>;
    /** Unique on idempotencyKey; duplicate=true when the key already exists. */
    insertScoreOnce(
        row: Omit<ScoreRow, 'id' | 'createdAt'> & { idempotencyKey: string },
    ): Promise<{ duplicate: boolean }>;
    /** Read-only idempotency probe (checked before cap enforcement). */
    hasScore(idempotencyKey: string): Promise<boolean>;
    topScores(gameId: string, eventId: string | null, limit: number): Promise<ScoreRow[]>;
    getState(
        gameId: string,
        clubId: string,
        scope: 'club' | 'member',
        userId: string | null,
        key: string,
    ): Promise<{ value: unknown; expiresAt: string | null } | null>;
    setState(
        gameId: string,
        clubId: string,
        scope: 'club' | 'member',
        userId: string | null,
        key: string,
        value: unknown,
        expiresAt: string | null,
    ): Promise<void>;
    countStateKeys(
        gameId: string,
        clubId: string,
        scope: 'club' | 'member',
        userId: string | null,
    ): Promise<number>;
    /** Unique on idempotencyKey; duplicate=true when the key already exists. */
    insertAwardOnce(row: {
        gameId: string;
        clubId: string;
        userId: string;
        sessionId: string;
        points: number;
        idempotencyKey: string;
    }): Promise<{ duplicate: boolean }>;
    /** Read-only idempotency probe (checked before cap enforcement). */
    hasAward(idempotencyKey: string): Promise<boolean>;
    insertOutcome(row: {
        gameId: string;
        clubId: string;
        userId: string;
        type: string;
        payload: Record<string, unknown>;
    }): Promise<void>;
    insertUnlock(row: Omit<UnlockRow, 'id' | 'createdAt'>): Promise<UnlockRow>;
    listActiveUnlocks(clubId: string, userId: string, nowIso: string): Promise<UnlockRow[]>;
    insertAudit(row: {
        gameId: string;
        sessionId: string | null;
        userId: string;
        method: string;
        ok: boolean;
        detail: string | null;
    }): Promise<void>;
}

export interface MemberContext {
    id: string;
    displayName: string;
    avatarUrl: string | null;
    role: string;
    points: number;
}

export interface GameServiceDeps {
    db: GameDb;
    /** Grants club points through the existing gamification system. */
    grantPoints(input: {
        userId: string;
        clubId: string;
        points: number;
        reason: string;
        gameId: string;
        sessionId: string;
    }): Promise<void>;
    /** Null when the user is not a member of the club. */
    memberContext(userId: string, clubId: string): Promise<MemberContext | null>;
    eventContext(
        clubId: string,
        eventId: string,
    ): Promise<{ id: string; title: string; phase: string } | null>;
    /** Best-effort mirror into community intelligence; never throws. */
    recordOutcomeSignal?(input: {
        clubId: string;
        memberId: string;
        gameId: string;
        type: string;
    }): Promise<void>;
    now?: () => Date;
}

export type BridgeCallResult =
    | { ok: true; result: unknown }
    | { ok: false; code: string; message: string };

const OUTCOME_TYPES = new Set([
    'member_started',
    'member_completed',
    'member_scored',
    'member_unlocked',
    'member_abandoned',
    'member_shared',
    'member_selected',
]);

const err = (code: string, message: string): BridgeCallResult => ({ ok: false, code, message });

// ---------------------------------------------------------------------------
// Service factory
// ---------------------------------------------------------------------------

export function createGameService(deps: GameServiceDeps) {
    const now = deps.now ?? (() => new Date());
    const rateWindows = new Map<string, number[]>();

    function rateLimited(sessionId: string): boolean {
        const t = now().getTime();
        const window = (rateWindows.get(sessionId) ?? []).filter(
            (ts) => t - ts < 60_000,
        );
        window.push(t);
        rateWindows.set(sessionId, window);
        return window.length > MINIGAME_CONSTRAINTS.bridgeRateLimitPerMinute;
    }

    async function audit(
        gameId: string,
        sessionId: string | null,
        userId: string,
        method: string,
        ok: boolean,
        detail: string | null,
    ): Promise<void> {
        try {
            await deps.db.insertAudit({ gameId, sessionId, userId, method, ok, detail });
        } catch {
            /* audit must never break the bridge */
        }
    }

    // -- Library ------------------------------------------------------------

    async function createDraft(input: {
        clubId: string;
        prompt: string;
        brief: GameBrief;
        html: string;
        validation: GameValidationReport | null;
        mock: boolean;
        createdBy: string;
        createdByAgent?: string | null;
        eventId?: string | null;
    }): Promise<GameRow> {
        return deps.db.insertGame({
            clubId: input.clubId,
            eventId: input.eventId ?? null,
            postId: null,
            createdBy: input.createdBy,
            createdByAgent: input.createdByAgent ?? null,
            title: input.brief.title,
            prompt: input.prompt,
            brief: input.brief,
            html: input.html,
            capabilities: [...input.brief.capabilities],
            status: 'draft',
            validation: input.validation,
            mock: input.mock,
        });
    }

    /**
     * Creator review (Phase: Approve / Edit / Reject). Approve publishes
     * ONLY a game whose stored validation passed — a failed artifact can
     * never reach members.
     */
    async function reviewGame(
        gameId: string,
        action: 'approve' | 'reject',
    ): Promise<GameRow> {
        const game = await deps.db.getGame(gameId);
        if (!game) throw new Error(`Game ${gameId} not found`);
        if (game.status !== 'draft') {
            throw new Error(`Game ${gameId} is not a draft (status: ${game.status})`);
        }
        if (action === 'approve') {
            if (!game.validation?.ok) {
                throw new Error('Cannot publish a game that failed validation');
            }
            await deps.db.updateGame(gameId, { status: 'published' });
        } else {
            await deps.db.updateGame(gameId, { status: 'rejected' });
        }
        return (await deps.db.getGame(gameId))!;
    }

    async function attachGame(
        gameId: string,
        target: { eventId?: string | null; postId?: string | null },
    ): Promise<GameRow> {
        const patch: Partial<GameRow> = {};
        if (target.eventId !== undefined) patch.eventId = target.eventId;
        if (target.postId !== undefined) patch.postId = target.postId;
        await deps.db.updateGame(gameId, patch);
        return (await deps.db.getGame(gameId))!;
    }

    // -- Sessions -----------------------------------------------------------

    async function startSession(input: {
        gameId: string;
        userId: string;
        kind: GameSessionKind;
    }): Promise<{ session: GameSessionRow; game: GameRow }> {
        const game = await deps.db.getGame(input.gameId);
        if (!game) throw new Error(`Game ${input.gameId} not found`);
        if (input.kind === 'play') {
            if (game.status !== 'published') {
                throw new Error('Only published games can be played');
            }
            const member = await deps.memberContext(input.userId, game.clubId);
            if (!member) throw new Error('Only club members can play this game');
        }
        const session = await deps.db.insertSession({
            gameId: game.id,
            clubId: game.clubId,
            userId: input.userId,
            eventId: game.eventId,
            kind: input.kind,
            startedAt: now().toISOString(),
            submissions: 0,
            awardsUsed: 0,
            pointsAwarded: 0,
        });
        return { session, game };
    }

    // -- Bridge dispatch ----------------------------------------------------

    async function handleBridgeCall(input: {
        sessionId: string;
        method: BridgeMethod;
        params?: Record<string, unknown>;
    }): Promise<BridgeCallResult> {
        const params = input.params ?? {};
        const session = await deps.db.getSession(input.sessionId);
        if (!session) return err('SESSION_NOT_FOUND', 'La sesión de juego no existe.');
        const game = await deps.db.getGame(session.gameId);
        if (!game) return err('GAME_NOT_FOUND', 'El juego no existe.');

        const finish = async (result: BridgeCallResult): Promise<BridgeCallResult> => {
            await audit(
                game.id,
                session.id,
                session.userId,
                input.method,
                result.ok,
                result.ok ? null : result.code,
            );
            return result;
        };

        // Session expiry applies to every method (brief session limit).
        const expiresAt =
            Date.parse(session.startedAt) + game.brief.sessionMinutes * 60_000;
        if (now().getTime() > expiresAt) {
            return finish(err('SESSION_EXPIRED', 'La sesión de juego terminó.'));
        }
        if (rateLimited(session.id)) {
            return finish(err('RATE_LIMITED', 'Demasiadas llamadas al club. Espera un momento.'));
        }

        // Declared-capability enforcement (the creator approved this list).
        const capability = BRIDGE_METHOD_CAPABILITIES[input.method];
        if (!game.capabilities.includes(capability)) {
            return finish(
                err(
                    'CAPABILITY_NOT_DECLARED',
                    `El juego no declaró la capacidad "${capability}".`,
                ),
            );
        }

        const preview = session.kind === 'preview';

        switch (input.method) {
            case 'member': {
                const member = await deps.memberContext(session.userId, game.clubId);
                if (!member) return finish(err('NOT_A_MEMBER', 'No eres miembro de este club.'));
                return finish({ ok: true, result: member });
            }
            case 'event': {
                if (!session.eventId) {
                    return finish(err('NO_EVENT_CONTEXT', 'Este juego no está dentro de un evento.'));
                }
                const event = await deps.eventContext(game.clubId, session.eventId);
                if (!event) return finish(err('NO_EVENT_CONTEXT', 'El evento no existe.'));
                return finish({ ok: true, result: event });
            }
            case 'leaderboard': {
                const scope = params.scope === 'club' ? 'club' : session.eventId ? 'event' : 'club';
                const entries = await leaderboard(
                    game,
                    scope === 'event' ? session.eventId : null,
                );
                return finish({ ok: true, result: { scope, entries } });
            }
            case 'submitScore': {
                const score = params.score;
                if (
                    typeof score !== 'number' ||
                    !Number.isFinite(score) ||
                    score < 0 ||
                    score > game.brief.maxScore ||
                    score > MINIGAME_CONSTRAINTS.maxScore
                ) {
                    return finish(err('SCORE_OUT_OF_RANGE', 'Puntuación fuera del rango permitido.'));
                }
                const idempotencyKey =
                    typeof params.idempotencyKey === 'string' && params.idempotencyKey
                        ? params.idempotencyKey
                        : `${session.id}:submit:${session.submissions}`;
                if (preview) {
                    return finish({ ok: true, result: { accepted: true, preview: true, best: score } });
                }
                // Idempotency BEFORE counters: a retry of an accepted
                // submit is a duplicate, never a cap violation.
                if (await deps.db.hasScore(idempotencyKey)) {
                    return finish({ ok: true, result: { accepted: false, duplicate: true } });
                }
                if (session.submissions >= MINIGAME_CONSTRAINTS.maxSubmissionsPerSession) {
                    return finish(err('TOO_MANY_SUBMISSIONS', 'Demasiados envíos en esta sesión.'));
                }
                const { duplicate } = await deps.db.insertScoreOnce({
                    gameId: game.id,
                    clubId: game.clubId,
                    eventId: session.eventId,
                    userId: session.userId,
                    sessionId: session.id,
                    score: Math.floor(score),
                    idempotencyKey,
                });
                if (duplicate) {
                    return finish({ ok: true, result: { accepted: false, duplicate: true } });
                }
                session.submissions += 1;
                await deps.db.updateSession(session.id, { submissions: session.submissions });
                await recordOutcome(game, session, 'member_scored', { score });
                return finish({ ok: true, result: { accepted: true } });
            }
            case 'awardPoints': {
                const amount = params.amount;
                if (
                    typeof amount !== 'number' ||
                    !Number.isInteger(amount) ||
                    amount < 1 ||
                    amount > game.brief.pointsPerSession
                ) {
                    return finish(err('POINTS_OUT_OF_RANGE', 'Puntos fuera del rango permitido.'));
                }
                const idempotencyKey =
                    typeof params.idempotencyKey === 'string' && params.idempotencyKey
                        ? params.idempotencyKey
                        : `${session.id}:award:${session.awardsUsed}`;
                if (preview) {
                    return finish({ ok: true, result: { awarded: true, preview: true, points: amount } });
                }
                // Idempotency BEFORE caps: retrying an award that already
                // landed must read as a duplicate, not a cap violation.
                if (await deps.db.hasAward(idempotencyKey)) {
                    return finish({ ok: true, result: { awarded: false, duplicate: true } });
                }
                if (session.pointsAwarded + amount > game.brief.pointsPerSession) {
                    return finish(err('POINTS_CAP_EXCEEDED', 'Se alcanzó el máximo de puntos de la sesión.'));
                }
                if (session.awardsUsed >= MINIGAME_CONSTRAINTS.maxPointAwardsPerSession) {
                    return finish(err('TOO_MANY_AWARDS', 'Demasiadas entregas de puntos en esta sesión.'));
                }
                // Ledger first (unique idempotency key), grant second: a
                // retried call hits the ledger and never double-awards.
                const { duplicate } = await deps.db.insertAwardOnce({
                    gameId: game.id,
                    clubId: game.clubId,
                    userId: session.userId,
                    sessionId: session.id,
                    points: amount,
                    idempotencyKey,
                });
                if (duplicate) {
                    return finish({ ok: true, result: { awarded: false, duplicate: true } });
                }
                await deps.grantPoints({
                    userId: session.userId,
                    clubId: game.clubId,
                    points: amount,
                    reason: typeof params.reason === 'string' ? params.reason.slice(0, 200) : 'Minijuego',
                    gameId: game.id,
                    sessionId: session.id,
                });
                session.awardsUsed += 1;
                session.pointsAwarded += amount;
                await deps.db.updateSession(session.id, {
                    awardsUsed: session.awardsUsed,
                    pointsAwarded: session.pointsAwarded,
                });
                return finish({ ok: true, result: { awarded: true, points: amount } });
            }
            case 'getState': {
                const key = stateKey(params.key);
                if (!key) return finish(err('INVALID_STATE_KEY', 'Clave de estado no válida.'));
                const scope = params.scope === 'club' ? 'club' : 'member';
                const row = await deps.db.getState(
                    game.id,
                    game.clubId,
                    scope,
                    scope === 'member' ? session.userId : null,
                    key,
                );
                if (row?.expiresAt && Date.parse(row.expiresAt) < now().getTime()) {
                    return finish({ ok: true, result: { value: null } });
                }
                return finish({ ok: true, result: { value: row?.value ?? null } });
            }
            case 'setState': {
                const key = stateKey(params.key);
                if (!key) return finish(err('INVALID_STATE_KEY', 'Clave de estado no válida.'));
                const scope = params.scope === 'club' ? 'club' : 'member';
                const serialized = JSON.stringify(params.value ?? null) ?? 'null';
                if (serialized.length > MINIGAME_CONSTRAINTS.maxStateBytesPerKey) {
                    return finish(err('STATE_TOO_LARGE', 'El estado supera el tamaño máximo.'));
                }
                const userScope = scope === 'member' ? session.userId : null;
                const existing = await deps.db.getState(game.id, game.clubId, scope, userScope, key);
                if (!existing) {
                    const count = await deps.db.countStateKeys(game.id, game.clubId, scope, userScope);
                    if (count >= MINIGAME_CONSTRAINTS.maxStateKeys) {
                        return finish(err('TOO_MANY_STATE_KEYS', 'Demasiadas claves de estado.'));
                    }
                }
                const ttlMinutes =
                    typeof params.ttlMinutes === 'number' && params.ttlMinutes > 0
                        ? Math.min(params.ttlMinutes, 43_200)
                        : null;
                await deps.db.setState(
                    game.id,
                    game.clubId,
                    scope,
                    userScope,
                    key,
                    params.value ?? null,
                    ttlMinutes ? new Date(now().getTime() + ttlMinutes * 60_000).toISOString() : null,
                );
                return finish({ ok: true, result: { saved: true } });
            }
            case 'unlock': {
                const grant = typeof params.grant === 'string' ? params.grant.trim() : '';
                if (!grant || grant.length > 120) {
                    return finish(err('INVALID_GRANT', 'Desbloqueo no válido.'));
                }
                const ttlMinutes =
                    typeof params.ttlMinutes === 'number' && params.ttlMinutes > 0
                        ? Math.min(params.ttlMinutes, 10_080)
                        : 60;
                const expiresAt = new Date(now().getTime() + ttlMinutes * 60_000).toISOString();
                if (preview) {
                    return finish({ ok: true, result: { unlocked: true, preview: true, expiresAt } });
                }
                await deps.db.insertUnlock({
                    gameId: game.id,
                    clubId: game.clubId,
                    userId: session.userId,
                    grantKey: grant,
                    expiresAt,
                });
                await recordOutcome(game, session, 'member_unlocked', { grant });
                return finish({ ok: true, result: { unlocked: true, expiresAt } });
            }
            case 'outcome': {
                const type = typeof params.type === 'string' ? params.type : '';
                if (!OUTCOME_TYPES.has(type)) {
                    return finish(err('INVALID_OUTCOME', 'Tipo de resultado no válido.'));
                }
                if (!preview) {
                    const payload =
                        params.payload && typeof params.payload === 'object'
                            ? (params.payload as Record<string, unknown>)
                            : {};
                    await recordOutcome(game, session, type, payload);
                }
                return finish({ ok: true, result: { recorded: true } });
            }
        }
    }

    async function recordOutcome(
        game: GameRow,
        session: GameSessionRow,
        type: string,
        payload: Record<string, unknown>,
    ): Promise<void> {
        await deps.db.insertOutcome({
            gameId: game.id,
            clubId: game.clubId,
            userId: session.userId,
            type,
            payload,
        });
        if (deps.recordOutcomeSignal) {
            try {
                await deps.recordOutcomeSignal({
                    clubId: game.clubId,
                    memberId: session.userId,
                    gameId: game.id,
                    type,
                });
            } catch {
                /* signal mirror is best-effort */
            }
        }
    }

    async function leaderboard(
        game: GameRow,
        eventId: string | null,
        limit = MINIGAME_CONSTRAINTS.maxLeaderboardSize,
    ) {
        const rows = await deps.db.topScores(game.id, eventId, 200);
        const best = new Map<string, ScoreRow>();
        for (const row of rows) {
            // State/scores are read through the game's own club only; a
            // score from another club can never appear here because every
            // row was written under this game's club binding.
            if (row.clubId !== game.clubId) continue;
            const current = best.get(row.userId);
            if (!current || row.score > current.score) best.set(row.userId, row);
        }
        const entries = [...best.values()]
            .sort((a, b) => b.score - a.score)
            .slice(0, limit);
        const out = [];
        for (const entry of entries) {
            const member = await deps.memberContext(entry.userId, game.clubId).catch(() => null);
            out.push({
                userId: entry.userId,
                displayName: member?.displayName ?? 'Miembro',
                avatarUrl: member?.avatarUrl ?? null,
                score: entry.score,
                achievedAt: entry.createdAt,
            });
        }
        return out;
    }

    return {
        createDraft,
        reviewGame,
        attachGame,
        startSession,
        handleBridgeCall,
        leaderboard: async (gameId: string, eventId: string | null = null) => {
            const game = await deps.db.getGame(gameId);
            if (!game) throw new Error(`Game ${gameId} not found`);
            return leaderboard(game, eventId);
        },
        listLibrary: (clubId: string, status?: GameStatus) =>
            deps.db.listGames(clubId, status ? { status } : undefined),
        getGame: (gameId: string) => deps.db.getGame(gameId),
        listUnlocks: (clubId: string, userId: string) =>
            deps.db.listActiveUnlocks(clubId, userId, now().toISOString()),
    };
}

export type GameService = ReturnType<typeof createGameService>;

function stateKey(value: unknown): string | null {
    if (typeof value !== 'string') return null;
    const key = value.trim();
    if (!key || key.length > 64) return null;
    return key;
}

// ---------------------------------------------------------------------------
// In-memory GameDb (tests, demos, evals)
// ---------------------------------------------------------------------------

export function createInMemoryGameDb(): GameDb & {
    scores: ScoreRow[];
    outcomes: Array<{ gameId: string; clubId: string; userId: string; type: string }>;
    audits: Array<{ method: string; ok: boolean }>;
} {
    let seq = 0;
    const nextId = (p: string) => `${p}-${++seq}`;
    const games = new Map<string, GameRow>();
    const sessions = new Map<string, GameSessionRow>();
    const scores: ScoreRow[] = [];
    const scoreKeys = new Set<string>();
    const awardKeys = new Set<string>();
    const states = new Map<string, { value: unknown; expiresAt: string | null }>();
    const unlocks: UnlockRow[] = [];
    const outcomes: Array<{ gameId: string; clubId: string; userId: string; type: string; payload: Record<string, unknown> }> = [];
    const audits: Array<{ method: string; ok: boolean }> = [];
    const stateId = (g: string, c: string, s: string, u: string | null, k: string) =>
        [g, c, s, u ?? '-', k].join('|');

    return {
        scores,
        outcomes,
        audits,
        async insertGame(row) {
            const full: GameRow = {
                ...row,
                id: nextId('game'),
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            };
            games.set(full.id, full);
            return full;
        },
        async getGame(id) {
            return games.get(id) ?? null;
        },
        async updateGame(id, patch) {
            const g = games.get(id);
            if (g) games.set(id, { ...g, ...patch, updatedAt: new Date().toISOString() });
        },
        async listGames(clubId, opts) {
            return [...games.values()].filter(
                (g) => g.clubId === clubId && (!opts?.status || g.status === opts.status),
            );
        },
        async insertSession(row) {
            const full: GameSessionRow = { ...row, id: nextId('sess') };
            sessions.set(full.id, full);
            return full;
        },
        async getSession(id) {
            const s = sessions.get(id);
            return s ? { ...s } : null;
        },
        async updateSession(id, patch) {
            const s = sessions.get(id);
            if (s) sessions.set(id, { ...s, ...patch });
        },
        async insertScoreOnce(row) {
            if (scoreKeys.has(row.idempotencyKey)) return { duplicate: true };
            scoreKeys.add(row.idempotencyKey);
            scores.push({
                id: nextId('score'),
                gameId: row.gameId,
                clubId: row.clubId,
                eventId: row.eventId,
                userId: row.userId,
                sessionId: row.sessionId,
                score: row.score,
                createdAt: new Date().toISOString(),
            });
            return { duplicate: false };
        },
        async hasScore(idempotencyKey) {
            return scoreKeys.has(idempotencyKey);
        },
        async topScores(gameId, eventId, limit) {
            return scores
                .filter((s) => s.gameId === gameId && s.eventId === eventId)
                .sort((a, b) => b.score - a.score)
                .slice(0, limit);
        },
        async getState(gameId, clubId, scope, userId, key) {
            return states.get(stateId(gameId, clubId, scope, userId, key)) ?? null;
        },
        async setState(gameId, clubId, scope, userId, key, value, expiresAt) {
            states.set(stateId(gameId, clubId, scope, userId, key), { value, expiresAt });
        },
        async countStateKeys(gameId, clubId, scope, userId) {
            const prefix = [gameId, clubId, scope, userId ?? '-'].join('|') + '|';
            return [...states.keys()].filter((k) => k.startsWith(prefix)).length;
        },
        async insertAwardOnce(row) {
            if (awardKeys.has(row.idempotencyKey)) return { duplicate: true };
            awardKeys.add(row.idempotencyKey);
            return { duplicate: false };
        },
        async hasAward(idempotencyKey) {
            return awardKeys.has(idempotencyKey);
        },
        async insertOutcome(row) {
            outcomes.push(row);
        },
        async insertUnlock(row) {
            const full: UnlockRow = { ...row, id: nextId('unlock'), createdAt: new Date().toISOString() };
            unlocks.push(full);
            return full;
        },
        async listActiveUnlocks(clubId, userId, nowIso) {
            return unlocks.filter(
                (u) =>
                    u.clubId === clubId &&
                    u.userId === userId &&
                    (!u.expiresAt || u.expiresAt > nowIso),
            );
        },
        async insertAudit(row) {
            audits.push({ method: row.method, ok: row.ok });
        },
    };
}

// ---------------------------------------------------------------------------
// Production wiring (Supabase + existing gamification + signals)
// ---------------------------------------------------------------------------

function serviceClient(): SupabaseClient {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
        throw new Error('Supabase service client is not configured (games)');
    }
    return createClient(url, key, { auth: { persistSession: false } });
}

export function supabaseGameDb(client: SupabaseClient = serviceClient()): GameDb {
    /* eslint-disable @typescript-eslint/no-explicit-any */
    const sb = client as any;
    // Club-scope state rows store a sentinel user id: Postgres UNIQUE
    // treats NULLs as distinct, which would break upsert deduping.
    const CLUB_SCOPE_USER = '00000000-0000-0000-0000-000000000000';
    const mapGame = (r: any): GameRow => ({
        id: r.id,
        clubId: r.club_id,
        eventId: r.event_id,
        postId: r.post_id,
        createdBy: r.created_by,
        createdByAgent: r.created_by_agent,
        title: r.title,
        prompt: r.prompt,
        brief: r.brief,
        html: r.html,
        capabilities: r.capabilities ?? [],
        status: r.status,
        validation: r.validation,
        mock: r.mock ?? false,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
    });
    return {
        async insertGame(row) {
            const { data, error } = await sb
                .from('games')
                .insert({
                    club_id: row.clubId,
                    event_id: row.eventId,
                    post_id: row.postId,
                    created_by: row.createdBy,
                    created_by_agent: row.createdByAgent,
                    title: row.title,
                    prompt: row.prompt,
                    brief: row.brief,
                    html: row.html,
                    capabilities: row.capabilities,
                    status: row.status,
                    validation: row.validation,
                    mock: row.mock,
                })
                .select('*')
                .single();
            if (error) throw new Error(`games insert failed: ${error.message}`);
            return mapGame(data);
        },
        async getGame(id) {
            const { data } = await sb.from('games').select('*').eq('id', id).maybeSingle();
            return data ? mapGame(data) : null;
        },
        async updateGame(id, patch) {
            const dbPatch: Record<string, unknown> = { updated_at: new Date().toISOString() };
            if (patch.status !== undefined) dbPatch.status = patch.status;
            if (patch.eventId !== undefined) dbPatch.event_id = patch.eventId;
            if (patch.postId !== undefined) dbPatch.post_id = patch.postId;
            if (patch.html !== undefined) dbPatch.html = patch.html;
            if (patch.brief !== undefined) dbPatch.brief = patch.brief;
            if (patch.title !== undefined) dbPatch.title = patch.title;
            if (patch.capabilities !== undefined) dbPatch.capabilities = patch.capabilities;
            const { error } = await sb.from('games').update(dbPatch).eq('id', id);
            if (error) throw new Error(`games update failed: ${error.message}`);
        },
        async listGames(clubId, opts) {
            let q = sb.from('games').select('*').eq('club_id', clubId).order('created_at', { ascending: false });
            if (opts?.status) q = q.eq('status', opts.status);
            const { data } = await q;
            return (data ?? []).map(mapGame);
        },
        async insertSession(row) {
            const { data, error } = await sb
                .from('game_sessions')
                .insert({
                    game_id: row.gameId,
                    club_id: row.clubId,
                    user_id: row.userId,
                    event_id: row.eventId,
                    kind: row.kind,
                    started_at: row.startedAt,
                    submissions: row.submissions,
                    awards_used: row.awardsUsed,
                    points_awarded: row.pointsAwarded,
                })
                .select('*')
                .single();
            if (error) throw new Error(`game_sessions insert failed: ${error.message}`);
            return {
                id: data.id,
                gameId: data.game_id,
                clubId: data.club_id,
                userId: data.user_id,
                eventId: data.event_id,
                kind: data.kind,
                startedAt: data.started_at,
                submissions: data.submissions,
                awardsUsed: data.awards_used,
                pointsAwarded: data.points_awarded,
            };
        },
        async getSession(id) {
            const { data } = await sb.from('game_sessions').select('*').eq('id', id).maybeSingle();
            if (!data) return null;
            return {
                id: data.id,
                gameId: data.game_id,
                clubId: data.club_id,
                userId: data.user_id,
                eventId: data.event_id,
                kind: data.kind,
                startedAt: data.started_at,
                submissions: data.submissions,
                awardsUsed: data.awards_used,
                pointsAwarded: data.points_awarded,
            };
        },
        async updateSession(id, patch) {
            const dbPatch: Record<string, unknown> = {};
            if (patch.submissions !== undefined) dbPatch.submissions = patch.submissions;
            if (patch.awardsUsed !== undefined) dbPatch.awards_used = patch.awardsUsed;
            if (patch.pointsAwarded !== undefined) dbPatch.points_awarded = patch.pointsAwarded;
            await sb.from('game_sessions').update(dbPatch).eq('id', id);
        },
        async insertScoreOnce(row) {
            const { error } = await sb.from('game_scores').insert({
                game_id: row.gameId,
                club_id: row.clubId,
                event_id: row.eventId,
                user_id: row.userId,
                session_id: row.sessionId,
                score: row.score,
                idempotency_key: row.idempotencyKey,
            });
            if (error) {
                if (error.code === '23505') return { duplicate: true };
                throw new Error(`game_scores insert failed: ${error.message}`);
            }
            return { duplicate: false };
        },
        async hasScore(idempotencyKey) {
            const { data } = await sb
                .from('game_scores')
                .select('id')
                .eq('idempotency_key', idempotencyKey)
                .maybeSingle();
            return Boolean(data);
        },
        async topScores(gameId, eventId, limit) {
            let q = sb
                .from('game_scores')
                .select('*')
                .eq('game_id', gameId)
                .order('score', { ascending: false })
                .limit(limit);
            q = eventId ? q.eq('event_id', eventId) : q.is('event_id', null);
            const { data } = await q;
            return (data ?? []).map((r: any) => ({
                id: r.id,
                gameId: r.game_id,
                clubId: r.club_id,
                eventId: r.event_id,
                userId: r.user_id,
                sessionId: r.session_id,
                score: r.score,
                createdAt: r.created_at,
            }));
        },
        async getState(gameId, clubId, scope, userId, key) {
            const { data } = await sb
                .from('game_states')
                .select('value, expires_at')
                .eq('game_id', gameId)
                .eq('club_id', clubId)
                .eq('scope', scope)
                .eq('state_key', key)
                .eq('user_id', userId ?? CLUB_SCOPE_USER)
                .maybeSingle();
            return data ? { value: data.value, expiresAt: data.expires_at } : null;
        },
        async setState(gameId, clubId, scope, userId, key, value, expiresAt) {
            const { error } = await sb.from('game_states').upsert(
                {
                    game_id: gameId,
                    club_id: clubId,
                    scope,
                    user_id: userId ?? CLUB_SCOPE_USER,
                    state_key: key,
                    value,
                    expires_at: expiresAt,
                    updated_at: new Date().toISOString(),
                },
                { onConflict: 'game_id,club_id,scope,user_id,state_key' },
            );
            if (error) throw new Error(`game_states upsert failed: ${error.message}`);
        },
        async countStateKeys(gameId, clubId, scope, userId) {
            const { count } = await sb
                .from('game_states')
                .select('id', { count: 'exact', head: true })
                .eq('game_id', gameId)
                .eq('club_id', clubId)
                .eq('scope', scope)
                .eq('user_id', userId ?? CLUB_SCOPE_USER);
            return count ?? 0;
        },
        async insertAwardOnce(row) {
            const { error } = await sb.from('game_point_awards').insert({
                game_id: row.gameId,
                club_id: row.clubId,
                user_id: row.userId,
                session_id: row.sessionId,
                points: row.points,
                idempotency_key: row.idempotencyKey,
            });
            if (error) {
                if (error.code === '23505') return { duplicate: true };
                throw new Error(`game_point_awards insert failed: ${error.message}`);
            }
            return { duplicate: false };
        },
        async hasAward(idempotencyKey) {
            const { data } = await sb
                .from('game_point_awards')
                .select('id')
                .eq('idempotency_key', idempotencyKey)
                .maybeSingle();
            return Boolean(data);
        },
        async insertOutcome(row) {
            await sb.from('game_outcomes').insert({
                game_id: row.gameId,
                club_id: row.clubId,
                user_id: row.userId,
                outcome_type: row.type,
                payload: row.payload,
            });
        },
        async insertUnlock(row) {
            const { data, error } = await sb
                .from('game_unlocks')
                .insert({
                    game_id: row.gameId,
                    club_id: row.clubId,
                    user_id: row.userId,
                    grant_key: row.grantKey,
                    expires_at: row.expiresAt,
                })
                .select('*')
                .single();
            if (error) throw new Error(`game_unlocks insert failed: ${error.message}`);
            return {
                id: data.id,
                gameId: data.game_id,
                clubId: data.club_id,
                userId: data.user_id,
                grantKey: data.grant_key,
                expiresAt: data.expires_at,
                createdAt: data.created_at,
            };
        },
        async listActiveUnlocks(clubId, userId, nowIso) {
            const { data } = await sb
                .from('game_unlocks')
                .select('*')
                .eq('club_id', clubId)
                .eq('user_id', userId)
                .or(`expires_at.is.null,expires_at.gt.${nowIso}`);
            return (data ?? []).map((r: any) => ({
                id: r.id,
                gameId: r.game_id,
                clubId: r.club_id,
                userId: r.user_id,
                grantKey: r.grant_key,
                expiresAt: r.expires_at,
                createdAt: r.created_at,
            }));
        },
        async insertAudit(row) {
            await sb.from('game_bridge_audit').insert({
                game_id: row.gameId,
                session_id: row.sessionId,
                user_id: row.userId,
                method: row.method,
                ok: row.ok,
                detail: row.detail,
            });
        },
    };
    /* eslint-enable @typescript-eslint/no-explicit-any */
}

/** Production service wiring (gamification grant + membership + events). */
export function defaultGameService(
    overrides: Partial<GameServiceDeps> = {},
): GameService {
    const client = serviceClient();
    const deps: GameServiceDeps = {
        db: supabaseGameDb(client),
        async grantPoints(input) {
            const { awardPoints } = await import('@/services/gamificationService');
            const internalSecret = process.env.INTERNAL_WORKER_SECRET;
            if (!internalSecret) throw new Error('INTERNAL_WORKER_SECRET is not configured');
            await awardPoints({
                userId: input.userId,
                clubId: input.clubId,
                actionType: 'ai_incentive',
                amount: input.points,
                reason: input.reason,
                internalSecret,
                metadata: { source: 'minigame', gameId: input.gameId, sessionId: input.sessionId },
            });
        },
        async memberContext(userId, clubId) {
            const { data } = await client
                .from('users_clubs')
                .select('role, points, users(name, avatar_url)')
                .eq('user_id', userId)
                .eq('club_id', clubId)
                .maybeSingle();
            if (!data) return null;
            const user = (data as unknown as { users?: { name?: string; avatar_url?: string } }).users;
            return {
                id: userId,
                displayName: user?.name ?? 'Miembro',
                avatarUrl: user?.avatar_url ?? null,
                role: (data as { role?: string }).role ?? 'member',
                points: (data as { points?: number }).points ?? 0,
            };
        },
        async eventContext(clubId, eventId) {
            const { data } = await client
                .from('club_events')
                .select('id, title, start_date, end_date')
                .eq('id', eventId)
                .eq('club_id', clubId)
                .maybeSingle();
            if (!data) return null;
            const { eventPhase } = await import('@/types/event');
            const row = data as { id: string; title: string; start_date: string; end_date: string };
            return { id: row.id, title: row.title, phase: eventPhase(row as never) };
        },
        async recordOutcomeSignal(input) {
            const { recordSignalSafe } = await import('../ai/relationship');
            await recordSignalSafe(input.clubId, {
                memberId: input.memberId,
                type: 'engaged',
                payload: { source: 'game', outcome: input.type, gameId: input.gameId },
            });
        },
        ...overrides,
    };
    return createGameService(deps);
}
