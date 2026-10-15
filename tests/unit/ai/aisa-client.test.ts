import {
    AISAClient,
    type AISAClientOptions,
    type FetchInit,
} from '@/lib/ai/aisa-client';
import type { AIAgentError } from '@/lib/ai/types';

interface FakeResponse {
    ok: boolean;
    status: number;
    json: () => Promise<unknown>;
}

type FetchFn = (url: string, init: FetchInit) => Promise<FakeResponse>;

function jsonResponse(status: number, body: unknown): FakeResponse {
    return { ok: status >= 200 && status < 300, status, json: async () => body };
}

function chatSuccess(content = '{"ok":true}'): FakeResponse {
    return jsonResponse(200, {
        choices: [{ message: { content } }],
        usage: { prompt_tokens: 5, completion_tokens: 7 },
    });
}

function clientWith(fetchFn: FetchFn, extra?: Partial<AISAClientOptions>): AISAClient {
    return new AISAClient({
        apiKey: 'test-key',
        fetchFn: fetchFn as AISAClientOptions['fetchFn'],
        sleep: async () => {},
        ...extra,
    });
}

const REQ = { messages: [{ role: 'user' as const, content: 'hi' }], model: 'm' };

function codeOf(err: unknown): string {
    return (err as AIAgentError).code;
}

describe('AISAClient', () => {
    test('throws AISA_NO_KEY when no key is provided and none in env', () => {
        const saved = process.env.AISA_API_KEY;
        delete process.env.AISA_API_KEY;
        try {
            let thrown: unknown;
            try {
                 
                new AISAClient({ fetchFn: (async () => chatSuccess()) as never });
            } catch (err) {
                thrown = err;
            }
            expect((thrown as AIAgentError).code).toBe('AISA_NO_KEY');
        } finally {
            if (saved !== undefined) process.env.AISA_API_KEY = saved;
        }
    });

    test('retries on transient network failure, then succeeds', async () => {
        let calls = 0;
        const fetchFn: FetchFn = async () => {
            calls += 1;
            if (calls === 1) throw new Error('socket hang up');
            return chatSuccess('{"done":true}');
        };
        const sleep = jest.fn().mockResolvedValue(undefined);
        const client = clientWith(fetchFn, { sleep });

        const res = await client.chat(REQ);

        expect(calls).toBe(2);
        expect(sleep).toHaveBeenCalledTimes(1);
        expect(JSON.parse(res.content)).toEqual({ done: true });
        expect(res.usage).toEqual({ promptTokens: 5, completionTokens: 7 });
    });

    test('retries on 5xx, then throws AISA_UNREACHABLE when all attempts fail', async () => {
        let calls = 0;
        const fetchFn: FetchFn = async () => {
            calls += 1;
            return jsonResponse(503, { error: 'overloaded' });
        };
        const client = clientWith(fetchFn);

        await expect(client.chat(REQ)).rejects.toMatchObject({ code: 'AISA_UNREACHABLE' });
        // 1 initial attempt + 2 retries
        expect(calls).toBe(3);
    });

    test('throws AISA_AUTH on 401 without retrying', async () => {
        let calls = 0;
        const fetchFn: FetchFn = async () => {
            calls += 1;
            return jsonResponse(401, { error: 'bad key' });
        };
        const client = clientWith(fetchFn);

        const err = await client.chat(REQ).catch((e: unknown) => e);
        expect(codeOf(err)).toBe('AISA_AUTH');
        expect(calls).toBe(1);
    });

    test('throws AISA_RATE_LIMIT on 429 without retrying', async () => {
        const fetchFn: FetchFn = async () => jsonResponse(429, { error: 'slow down' });
        const client = clientWith(fetchFn);

        const err = await client.chat(REQ).catch((e: unknown) => e);
        expect(codeOf(err)).toBe('AISA_RATE_LIMIT');
    });

    test('sends response_format json_object and bearer auth when jsonMode', async () => {
        let seenUrl = '';
        const seenInits: FetchInit[] = [];
        const fetchFn: FetchFn = async (url, init) => {
            seenUrl = url;
            seenInits.push(init);
            return chatSuccess();
        };
        const client = clientWith(fetchFn);

        await client.chat({ ...REQ, jsonMode: true });

        expect(seenUrl).toBe('https://api.aisa.one/v1/chat/completions');
        expect(seenInits).toHaveLength(1);
        const seenInit = seenInits[0] as FetchInit;
        expect(seenInit.headers['Authorization']).toBe('Bearer test-key');
        const body = JSON.parse(seenInit.body) as Record<string, unknown>;
        expect(body['model']).toBe('m');
        expect(body['response_format']).toEqual({ type: 'json_object' });
        expect(body['messages']).toEqual([{ role: 'user', content: 'hi' }]);
    });

    test('no response_format when jsonMode is not set', async () => {
        const seenInits: FetchInit[] = [];
        const fetchFn: FetchFn = async (_url, init) => {
            seenInits.push(init);
            return chatSuccess();
        };
        const client = clientWith(fetchFn);

        await client.chat(REQ);

        expect(seenInits).toHaveLength(1);
        const body = JSON.parse((seenInits[0] as FetchInit).body) as Record<string, unknown>;
        expect(body['response_format']).toBeUndefined();
    });

    test('aborts and throws AISA_UNREACHABLE when the request times out', async () => {
        const fetchFn: FetchFn = () => new Promise(() => {}); // never resolves
        const client = clientWith(fetchFn, { timeoutMs: 30, sleep: async () => {} });

        const err = await client.chat(REQ).catch((e: unknown) => e);
        expect(codeOf(err)).toBe('AISA_UNREACHABLE');
    });
});
