/**
 * GameBrief — the structuring layer UNDER free code generation
 * (Workstream B; Roger's redefinition of the "spec", 2026-10-23).
 *
 * Creation flow: creator prompt → **structured brief** → free code
 * generation. The brief is built FIRST (by the AI, validated by zod,
 * shown to the creator at review): it fixes the game's type, mechanics,
 * scoring intent, the club capabilities it needs, its content sources,
 * and its limits — all clamped to MINIGAME_CONSTRAINTS. The generating
 * AI then receives the brief (not the raw prompt) and writes ONE
 * self-contained HTML file implementing it.
 *
 * The brief is also the publish-time contract: the capabilities it
 * declares are what the creator approves and what the bridge enforces
 * server-side. A game can never use a capability its brief did not
 * declare.
 */
import { z } from 'zod';

import { GAME_CAPABILITIES, MINIGAME_CONSTRAINTS } from './constraints';

export const GameContentSourceSchema = z.object({
    /** Where the generation-time content comes from. */
    type: z.enum(['recent_posts', 'post', 'event']),
    /** For 'post': the specific post id. For 'event': the event id. */
    id: z.string().min(1).max(120).optional(),
    /** For 'recent_posts': how many recent posts to draw from (1-10). */
    count: z.number().int().min(1).max(10).optional(),
});
export type GameContentSource = z.infer<typeof GameContentSourceSchema>;

export const GameBriefSchema = z.object({
    title: z.string().trim().min(3).max(80),
    description: z.string().trim().min(10).max(400),
    /** Free-form type label ('quiz', 'memoria', 'reflejos', 'puzzle'…). */
    gameType: z.string().trim().min(2).max(40),
    mechanics: z.string().trim().min(10).max(600),
    /** v1 is asynchronous: 'single' (solo play) or 'async' (compete via leaderboard over time). */
    players: z.enum(['single', 'async']),
    scoringIntent: z.string().trim().min(5).max(300),
    /** Hard cap for any score this game can report (server-enforced). */
    maxScore: z.number().int().min(1).max(MINIGAME_CONSTRAINTS.maxScore),
    /** Hard cap for points requested per member per session (server-enforced). */
    pointsPerSession: z
        .number()
        .int()
        .min(0)
        .max(MINIGAME_CONSTRAINTS.maxPointsPerSession),
    sessionMinutes: z.number().int().min(1).max(MINIGAME_CONSTRAINTS.maxSessionMinutes),
    /** Declared bridge capabilities — whitelist only, shown to the creator. */
    capabilities: z.array(z.enum(GAME_CAPABILITIES)).max(GAME_CAPABILITIES.length),
    /** Declared when the game is born from club content (generation-time read). */
    contentSource: GameContentSourceSchema.optional(),
    theme: z.string().trim().max(300).optional(),
});
export type GameBrief = z.infer<typeof GameBriefSchema>;

/**
 * The agent definition for the brief step. The code-generation step uses
 * the same definition id ('game-creator') with a code-shaped output
 * schema — see generate.ts. Both steps run through invokeAgent, so the
 * club AI budget, input guards, flags and usage logging apply.
 */
export const GAME_CREATOR_AGENT_ID = 'game-creator';
