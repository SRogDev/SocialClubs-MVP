/**
 * MINIGAME_CONSTRAINTS — the codified "MINI" ruleset (Workstream B).
 *
 * Roger's decision (2026-10-23): the AI may generate ANY minigame as free
 * code, but only MINIGAMES are allowed. These constants are the contract:
 * the brief schema clamps to them, the static validator enforces them,
 * the bridge enforces them again server-side at runtime (defense in
 * depth — a generated game that slips past validation still cannot
 * exceed them), and docs/MINIGAMES.md documents them for creators.
 *
 * A minigame is: ONE self-contained HTML file, played in short async
 * sessions, talking to the club ONLY through the ClubGame bridge.
 */

/** Bridge capabilities a game may declare (closed whitelist). */
export const GAME_CAPABILITIES = [
    /** Read the current member's public club context (id, name, avatar, tier). */
    'member.profile',
    /** Request club points for the player (server-validated, capped). */
    'points.award',
    /** Submit scores / read the game leaderboard (club- or event-scoped). */
    'leaderboard',
    /** Persistent per-game state (club scope and per-member scope). */
    'game.state',
    /** Read the hosting event's context + lifecycle phase (in-event play). */
    'event.context',
    /** Grant temporary unlocks as rewards (expiring, ephemeral pattern). */
    'unlocks',
    /** Emit experience outcomes (member_started/completed/scored/unlocked). */
    'outcomes',
    /**
     * Read club content (posts) — GENERATION TIME ONLY. The generating AI
     * uses it to build content-born games (e.g. a quiz from the creator's
     * latest post); game code itself never reads content at runtime.
     */
    'content.read',
] as const;

export type GameCapability = (typeof GAME_CAPABILITIES)[number];

export const MINIGAME_CONSTRAINTS = {
    /** One single self-contained HTML file, at most 64 KiB of code. */
    maxCodeBytes: 65_536,
    /** A play session is short: at most 10 minutes (enforced server-side). */
    maxSessionMinutes: 10,
    /** Scores are bounded; the brief picks a cap at or below this. */
    maxScore: 100_000,
    /** Total points a game may request for one member in one session. */
    maxPointsPerSession: 50,
    /** Number of separate point-award calls allowed per session. */
    maxPointAwardsPerSession: 3,
    /** Persistent game state: small JSON values only. */
    maxStateBytesPerKey: 8_192,
    maxStateKeys: 20,
    /** Leaderboards are short lists (matches the leaderboard widget max). */
    maxLeaderboardSize: 25,
    /** Bridge calls per session per minute (host + server enforced). */
    bridgeRateLimitPerMinute: 60,
    /** Score submissions per session (anti-spam; best score is kept). */
    maxSubmissionsPerSession: 20,
    /** Game generation: one repair retry after a failed validation. */
    maxGenerationAttempts: 2,
} as const;

/** ClubGame SDK method -> bridge capability it requires. */
export const BRIDGE_METHOD_CAPABILITIES: Record<string, GameCapability> = {
    member: 'member.profile',
    awardPoints: 'points.award',
    submitScore: 'leaderboard',
    leaderboard: 'leaderboard',
    getState: 'game.state',
    setState: 'game.state',
    event: 'event.context',
    unlock: 'unlocks',
    outcome: 'outcomes',
};
