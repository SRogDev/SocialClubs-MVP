/**
 * Minigame generation pipeline (Workstream B; Roger's flow, 2026-10-23):
 *
 *   creator prompt
 *     → STEP 1: structured GameBrief (the structuring layer — invokeAgent,
 *       zod-validated, capabilities whitelisted, caps clamped)
 *     → content fetch (only when the brief declares a content source AND
 *       the 'content.read' capability — generation-time, read-only)
 *     → STEP 2: free code generation FROM THE BRIEF (one self-contained
 *       HTML file; the model never sees the raw prompt alone)
 *     → static validation (validate.ts); on failure, ONE repair retry
 *       with the violations fed back; then the result is reported, never
 *       hidden.
 *
 * Both AI steps run through invokeAgent: club AI budget enforced before
 * each call, prompt-injection screening, usage logged (Roger's default:
 * generation draws from the club AI budget).
 *
 * Offline path (no AISA_API_KEY → MockAIClient): fully deterministic —
 * a keyword-built brief plus the platform sample game (a real playable
 * reaction game), so dev/demo/e2e work at $0. Labeled `mock: true` in
 * the result; never presented as AI output.
 */
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

import { invokeAgent, type InvokeDeps } from '../ai/runtime';
import { screenAgentInput } from '../ai/input-guards';
import { MockAIClient } from '../ai/mock-client';
import { AISAClient } from '../ai/aisa-client';
import { AIAgentError, type AgentDefinition } from '../ai/types';
import {
    GameBriefSchema,
    GAME_CREATOR_AGENT_ID,
    type GameBrief,
    type GameContentSource,
} from './brief';
import { MINIGAME_CONSTRAINTS } from './constraints';
import { validateGameCode, type GameValidationReport } from './validate';

export interface GenerateGameInput {
    clubId: string;
    prompt: string;
    createdBy: string;
    /** Set when the Experience Director (club AI) is the author. */
    createdByAgent?: string;
    eventId?: string | null;
}

/** Read-only club content access for content-born games (generation time). */
export interface GameContentPort {
    fetchContent(
        clubId: string,
        source: GameContentSource,
    ): Promise<string | null>;
}

export interface GenerateGameDeps extends InvokeDeps {
    content?: GameContentPort;
}

export interface GenerateGameResult {
    brief: GameBrief;
    html: string;
    validation: GameValidationReport;
    /** True when produced by the deterministic offline path. */
    mock: boolean;
    /** Code-generation attempts used (1 = clean pass, 2 = repaired/failed). */
    attempts: number;
    /** Whether declared club content was actually fed to generation. */
    contentUsed: boolean;
}

// ---------------------------------------------------------------------------
// Agent definitions
// ---------------------------------------------------------------------------

function briefAgentDef(): AgentDefinition {
    return {
        id: GAME_CREATOR_AGENT_ID,
        role: 'Diseñador de minijuegos',
        mission:
            'Convert a creator idea into a structured minigame brief (GameBrief). ' +
            'The brief — not the raw idea — is what the code generator will receive.',
        contextSources: ['club'],
        tools: [],
        permissions: [],
        triggers: ['game_prompt'],
        policies: [
            'Write title, description, mechanics and scoringIntent in Spanish.',
            `Declare ONLY capabilities from this whitelist: member.profile, points.award, leaderboard, game.state, event.context, unlocks, outcomes, content.read, apps.invoke.`,
            'Set profile to "widget" when the idea is a small glanceable utility for club surfaces (latest video, follower counts, a playlist…) instead of a playable game; widgets cannot award points or scores. Default profile is "game".',
            'If the artifact should use the club\'s CONNECTED APPS (YouTube, TikTok, Instagram, X, Twitch, Spotify, Discord), declare the apps.invoke capability AND list each exact action in externalActions using registry names: ext.youtube.YOUTUBE_GET_CHANNEL_STATISTICS, ext.tiktok.TIKTOK_LIST_VIDEOS, ext.spotify.SPOTIFY_GET_PLAYLIST — only actions the artifact truly calls.',
            'If the game is born from club content (a post, recent posts, an event), set contentSource AND declare the content.read capability.',
            `Respect the MINI limits: maxScore ≤ ${MINIGAME_CONSTRAINTS.maxScore}, pointsPerSession ≤ ${MINIGAME_CONSTRAINTS.maxPointsPerSession}, sessionMinutes ≤ ${MINIGAME_CONSTRAINTS.maxSessionMinutes}.`,
            'Asynchronous play only: players is "single" (solo) or "async" (leaderboard competition over time). Never design live multiplayer.',
            'Keep the game small: one short session, one screen, simple controls (tap/click/keyboard).',
        ],
        outputSchema: GameBriefSchema,
        tier: 'smart',
    };
}

const GameCodeSchema = z.object({ html: z.string().min(1).max(400_000) });

function codeAgentDef(): AgentDefinition {
    return {
        id: GAME_CREATOR_AGENT_ID,
        role: 'Programador de minijuegos',
        mission:
            'Write ONE complete, playable, self-contained HTML minigame that implements the GameBrief provided. ' +
            'Return JSON { "html": "..." } with the full file.',
        contextSources: ['club'],
        tools: [],
        permissions: [],
        triggers: ['game_brief'],
        policies: [
            'The html must be a single self-contained file: inline <style> and <script> only. NO external resources (no CDN, no fonts, no images by URL — use CSS/emoji-free drawing, gradients, or data: URIs).',
            'NO network: never use fetch, XMLHttpRequest, WebSocket, EventSource, sendBeacon. NO storage: never use localStorage, sessionStorage, indexedDB, cookies. NO eval, Function, dynamic import, WebAssembly, window.open, or navigation.',
            'Communicate with the club ONLY through the global ClubGame SDK (injected by the platform): ClubGame.member(), ClubGame.awardPoints(amount, reason, idempotencyKey), ClubGame.submitScore(score, idempotencyKey), ClubGame.leaderboard(scope), ClubGame.getState(key, scope), ClubGame.setState(key, value, opts), ClubGame.event(), ClubGame.unlock(grant, ttlMinutes), ClubGame.outcome(type, payload), ClubGame.app(actionId, args) for connected apps. NEVER call postMessage directly.',
            'Use ONLY the ClubGame methods whose capabilities the brief declares. For ClubGame.app, call ONLY the exact actionIds listed in the brief externalActions; a read returns {status:"executed", data}; a write may return {status:"pending_approval"} — show the member a friendly "pendiente de aprobación del creador" state instead of failing.',
            'Use ONLY the ClubGame methods whose capabilities the brief declares. If the brief does not declare a capability, do not call its method.',
            'Scores must never exceed the brief maxScore; points requested must never exceed the brief pointsPerSession.',
            'The game must be fully playable with mouse/touch (mobile-first), in Spanish, completable within the brief sessionMinutes, and must handle ClubGame promise rejections gracefully.',
            'If repairErrors are provided, fix EVERY listed violation while keeping the game faithful to the brief.',
        ],
        outputSchema: GameCodeSchema,
        tier: 'smart',
    };
}

// ---------------------------------------------------------------------------
// Deterministic offline path (mock client)
// ---------------------------------------------------------------------------

/** Keyword-built brief for the offline path. Deterministic and honest. */
export function buildDeterministicBrief(prompt: string): GameBrief {
    const p = prompt.toLowerCase();
    const wantsContent =
        /(post|contenido|video|publicaci|últim|ultim)/.test(p) &&
        /(quiz|pregunta|trivia)/.test(p);
    const base = {
        title: prompt.trim().slice(0, 60) || 'Minijuego del club',
        description: `Minijuego creado a partir de la idea: "${prompt.trim().slice(0, 200)}"`,
        scoringIntent: 'Puntos por aciertos y rapidez; el mejor resultado va a la clasificación.',
        maxScore: 1000,
        pointsPerSession: 20,
        sessionMinutes: 5,
        players: 'async' as const,
        theme: 'Colores del club, tono alegre, una sola pantalla.',
    };
    if (/(memoria|memory|parejas|cartas)/.test(p)) {
        return {
            ...base,
            gameType: 'memoria',
            mechanics: 'Encuentra las parejas de cartas en el menor número de intentos.',
            capabilities: ['leaderboard', 'points.award', 'outcomes', 'game.state'],
        };
    }
    if (/(reflejo|reacci|toca|atrapa|rapidez|velocidad)/.test(p)) {
        return {
            ...base,
            gameType: 'reflejos',
            mechanics: 'Toca el objetivo correcto apenas aparezca; cada acierto suma según la rapidez.',
            capabilities: ['leaderboard', 'points.award', 'outcomes'],
        };
    }
    return {
        ...base,
        gameType: 'quiz',
        mechanics: 'Responde preguntas de opción múltiple; cada acierto suma puntos.',
        capabilities: wantsContent
            ? ['member.profile', 'leaderboard', 'points.award', 'outcomes', 'content.read']
            : ['member.profile', 'leaderboard', 'points.award', 'outcomes'],
        ...(wantsContent ? { contentSource: { type: 'recent_posts' as const, count: 3 } } : {}),
    };
}

/**
 * The platform sample game for the offline path: a real, playable
 * reaction game honoring the brief's caps. SDK calls are emitted only
 * for capabilities the brief declares, so the sample passes
 * validateGameCode for every deterministic brief.
 */
export function buildSampleGameHtml(brief: GameBrief): string {
    const caps = new Set(brief.capabilities);
    const finishCalls: string[] = [];
    if (caps.has('outcomes')) {
        finishCalls.push(`await ClubGame.outcome('member_completed', { score: score });`);
    }
    if (caps.has('leaderboard')) {
        finishCalls.push(`await ClubGame.submitScore(score, 'sample-' + Date.now());`);
    }
    if (caps.has('points.award') && brief.pointsPerSession > 0) {
        finishCalls.push(
            `await ClubGame.awardPoints(${brief.pointsPerSession}, 'juego completado', 'sample-award-' + Date.now());`,
        );
    }
    return `<!DOCTYPE html>
<html lang="es"><head><meta charset="utf-8"><title>${escapeHtml(brief.title)}</title>
<style>
body{font-family:system-ui,sans-serif;background:#0f0f23;color:#e2e8f0;display:flex;flex-direction:column;align-items:center;gap:12px;padding:16px;margin:0}
#target{width:72px;height:72px;border-radius:50%;background:#7c3aed;border:none;cursor:pointer;display:none}
button.cta{background:#7c3aed;color:#fff;border:none;border-radius:10px;padding:12px 20px;font-size:16px;cursor:pointer;min-height:44px}
</style></head>
<body>
<h1>${escapeHtml(brief.title)}</h1>
<p id="msg">Toca el círculo apenas aparezca. ¡Rápido suma más!</p>
<button id="target" aria-label="Objetivo"></button>
<button id="start" class="cta">Jugar</button>
<p id="score"></p>
<script>
var score = 0, rounds = 0, shownAt = 0, timer = null;
var target = document.getElementById('target');
var msg = document.getElementById('msg');
document.getElementById('start').addEventListener('click', function () {
  score = 0; rounds = 0;
  document.getElementById('start').style.display = 'none';
  next();
});
function next() {
  if (rounds >= 5) { finish(); return; }
  rounds++;
  msg.textContent = 'Prepárate…';
  target.style.display = 'none';
  timer = setTimeout(function () {
    shownAt = Date.now();
    target.style.display = 'block';
  }, 600 + Math.random() * 1200);
}
target.addEventListener('click', async function () {
  var reaction = Date.now() - shownAt;
  var gained = Math.max(10, 200 - Math.floor(reaction / 5));
  score += gained;
  document.getElementById('score').textContent = 'Puntos: ' + score;
  next();
});
async function finish() {
  target.style.display = 'none';
  msg.textContent = '¡Fin! Puntuación: ' + score;
  try {
${finishCalls.map((c) => '    ' + c).join('\n')}
  } catch (e) { /* el club no está disponible en esta vista */ }
}
</script>
</body></html>`;
}

function escapeHtml(s: string): string {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ---------------------------------------------------------------------------
// Default content port (Supabase recent posts / single post)
// ---------------------------------------------------------------------------

function defaultContentPort(): GameContentPort {
    return {
        async fetchContent(clubId, source) {
            const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
            const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
            if (!url || !serviceKey) return null;
            try {
                const supabase = createClient(url, serviceKey);
                let query = supabase
                    .from('posts')
                    .select('content, created_at')
                    .eq('club_id', clubId)
                    .order('created_at', { ascending: false });
                if (source.type === 'post' && source.id) query = query.eq('id', source.id);
                else query = query.limit(source.count ?? 3);
                const { data, error } = await query;
                if (error || !data || data.length === 0) return null;
                const texts = data.map((row) => extractPostText(row.content)).filter(Boolean);
                return texts.length > 0 ? texts.join('\n\n---\n\n').slice(0, 12_000) : null;
            } catch {
                return null;
            }
        },
    };
}

/** Best-effort plain-text extraction from a post content payload. */
function extractPostText(content: unknown): string {
    if (typeof content === 'string') return content;
    if (content && typeof content === 'object') {
        const obj = content as Record<string, unknown>;
        const parts: string[] = [];
        for (const key of ['title', 'body', 'text', 'description', 'caption']) {
            if (typeof obj[key] === 'string') parts.push(obj[key] as string);
        }
        return parts.join('\n');
    }
    return '';
}

// ---------------------------------------------------------------------------
// The pipeline
// ---------------------------------------------------------------------------

function resolveClient(deps: GenerateGameDeps) {
    if (deps.client) return deps.client;
    return process.env.AISA_API_KEY?.trim() ? new AISAClient() : new MockAIClient();
}

function invokeDeps(deps: GenerateGameDeps): InvokeDeps {
    const out: InvokeDeps = {};
    if (deps.client) out.client = deps.client;
    if (deps.cost) out.cost = deps.cost;
    if (deps.now) out.now = deps.now;
    return out;
}

/**
 * Run the full generation pipeline. Never throws for validation failures
 * (they are reported in the result); throws typed AIAgentError for
 * blocked input, flag/budget failures, or an undeclared content read.
 */
export async function generateGame(
    input: GenerateGameInput,
    deps: GenerateGameDeps = {},
): Promise<GenerateGameResult> {
    const screen = screenAgentInput(input.prompt);
    if (screen.blocked) {
        throw new AIAgentError(
            'AI_INPUT_BLOCKED',
            `Game prompt blocked by input guards (${screen.matched.join(', ')}).`,
        );
    }

    const client = resolveClient(deps);
    const isMock = client.mock === true;

    // STEP 1 — the brief.
    let brief: GameBrief;
    if (isMock) {
        brief = buildDeterministicBrief(input.prompt);
    } else {
        const { output } = await invokeAgent<GameBrief>(
            briefAgentDef(),
            {
                type: 'game_brief',
                clubId: input.clubId,
                payload: { prompt: input.prompt, eventId: input.eventId ?? null },
            },
            invokeDeps(deps),
        );
        brief = GameBriefSchema.parse(output);
    }

    // Content fetch — only with BOTH a declared source and the capability.
    let contentText: string | null = null;
    if (brief.contentSource) {
        if (!brief.capabilities.includes('content.read')) {
            throw new AIAgentError(
                'AI_OUTPUT_INVALID',
                'The brief declares a contentSource but not the content.read capability; content-born games must declare it so the creator can approve it.',
            );
        }
        const port = deps.content ?? defaultContentPort();
        contentText = await port.fetchContent(input.clubId, brief.contentSource);
    }

    // STEP 2 — free code from the brief (+ up to one repair attempt).
    if (isMock) {
        const html = buildSampleGameHtml(brief);
        return {
            brief,
            html,
            validation: validateGameCode(html, brief),
            mock: true,
            attempts: 1,
            contentUsed: contentText !== null,
        };
    }

    let attempts = 0;
    let lastHtml = '';
    let lastReport: GameValidationReport | null = null;
    let repairErrors: string[] | undefined;
    while (attempts < MINIGAME_CONSTRAINTS.maxGenerationAttempts) {
        attempts++;
        const { output } = await invokeAgent<{ html: string }>(
            codeAgentDef(),
            {
                type: 'game_code',
                clubId: input.clubId,
                payload: {
                    brief,
                    contentText,
                    ...(repairErrors ? { repairErrors, previousHtml: lastHtml } : {}),
                },
            },
            invokeDeps(deps),
        );
        lastHtml = output.html;
        lastReport = validateGameCode(lastHtml, brief);
        if (lastReport.ok) break;
        repairErrors = lastReport.violations.map((v) => `${v.rule}: ${v.detail}`);
    }

    return {
        brief,
        html: lastHtml,
        validation: lastReport!,
        mock: false,
        attempts,
        contentUsed: contentText !== null,
    };
}
