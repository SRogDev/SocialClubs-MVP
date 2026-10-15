import { z } from 'zod';

import { MockAIClient, cannedFromSchema } from '@/lib/ai/mock-client';

const digestSchema = z.object({
    summary: z.string(),
    score: z.number(),
    tags: z.array(z.string()),
    active: z.boolean(),
    kind: z.enum(['a', 'b']),
    meta: z.object({ by: z.string() }).optional(),
});

describe('MockAIClient', () => {
    test('returns schema-valid canned JSON with zero tokens and mock=true', async () => {
        const client = new MockAIClient();
        const res = await client.chat({
            messages: [{ role: 'user', content: 'hello' }],
            model: 'any-model',
            jsonMode: true,
            outputSchema: digestSchema,
        });

        expect(client.mock).toBe(true);
        expect(res.usage).toEqual({ promptTokens: 0, completionTokens: 0 });

        const parsed: unknown = JSON.parse(res.content);
        expect(digestSchema.safeParse(parsed).success).toBe(true);
        expect(Object.keys(parsed as Record<string, unknown>).sort()).toEqual([
            'active',
            'kind',
            'meta',
            'score',
            'summary',
            'tags',
        ]);
    });

    test('cannedFromSchema echoes field names in string placeholders', () => {
        const canned = cannedFromSchema(digestSchema) as Record<string, unknown>;
        expect(typeof canned['summary']).toBe('string');
        expect(String(canned['summary'])).toContain('summary');
        expect(typeof canned['score']).toBe('number');
        expect(Array.isArray(canned['tags'])).toBe(true);
        expect(typeof canned['active']).toBe('boolean');
        expect(canned['kind']).toBe('a');
    });

    test('chat without outputSchema still returns valid JSON', async () => {
        const client = new MockAIClient();
        const res = await client.chat({ messages: [], model: 'x' });
        expect(() => JSON.parse(res.content)).not.toThrow();
        expect(res.usage.promptTokens).toBe(0);
    });

    test('mock output is deterministic across calls', async () => {
        const client = new MockAIClient();
        const req = { messages: [], model: 'x', outputSchema: digestSchema };
        const a = await client.chat(req);
        const b = await client.chat(req);
        expect(a.content).toBe(b.content);
    });
});
