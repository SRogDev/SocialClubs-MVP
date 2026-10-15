/**
 * AIsa LLM client (ADR-001 §1): OpenAI-compatible chat completions.
 *
 * - POST https://api.aisa.one/v1/chat/completions
 * - Auth: `Authorization: Bearer ${AISA_API_KEY}`
 * - `response_format: { type: "json_object" }` when jsonMode is requested.
 * - 30s timeout per attempt, up to 2 retries with exponential backoff on
 *   transient failures (network errors, timeouts, 5xx).
 * - Typed errors: AISA_NO_KEY (no key configured), AISA_AUTH (401/403),
 *   AISA_RATE_LIMIT (429), AISA_UNREACHABLE (everything else, incl. timeouts).
 *
 * This client NEVER mocks: with no key it throws AISA_NO_KEY and the runtime
 * selects the deterministic mock adapter instead.
 */
import {
    AIAgentError,
    type AIClient,
    type AIClientRequest,
    type AIClientResponse,
    type ChatMessage,
} from './types';

export const AISA_CHAT_URL = 'https://api.aisa.one/v1/chat/completions';
export const DEFAULT_TIMEOUT_MS = 30_000;
export const DEFAULT_MAX_RETRIES = 2;
const BACKOFF_BASE_MS = 250;

/** Minimal fetch surface the client needs — keeps the class unit-testable. */
export interface FetchLike {
    (url: string, init: FetchInit): Promise<FetchResponseLike>;
}

export interface FetchInit {
    method: string;
    headers: Record<string, string>;
    body: string;
    signal: AbortSignal;
}

export interface FetchResponseLike {
    ok: boolean;
    status: number;
    json(): Promise<unknown>;
}

interface AisaSuccessBody {
    choices?: Array<{ message?: { content?: string | null } }>;
    usage?: { prompt_tokens?: number; completion_tokens?: number };
}

export interface AISAClientOptions {
    apiKey?: string;
    fetchFn?: FetchLike;
    sleep?: (ms: number) => Promise<void>;
    timeoutMs?: number;
    maxRetries?: number;
}

const defaultFetch: FetchLike = (url, init) =>
    fetch(url, {
        method: init.method,
        headers: init.headers,
        body: init.body,
        signal: init.signal,
    }).then((res) => ({
        ok: res.ok,
        status: res.status,
        json: () => res.json() as Promise<unknown>,
    }));

const defaultSleep = (ms: number): Promise<void> =>
    new Promise((resolve) => setTimeout(resolve, ms));

function isTransientStatus(status: number): boolean {
    return status >= 500 && status < 600;
}

export class AISAClient implements AIClient {
    readonly mock = false;

    private readonly apiKey: string;
    private readonly fetchFn: FetchLike;
    private readonly sleep: (ms: number) => Promise<void>;
    private readonly timeoutMs: number;
    private readonly maxRetries: number;

    constructor(options: AISAClientOptions = {}) {
        const key = options.apiKey ?? process.env.AISA_API_KEY;
        if (!key || key.trim().length === 0) {
            throw new AIAgentError(
                'AISA_NO_KEY',
                'AISA_API_KEY is not set — the runtime selects the mock adapter instead.',
            );
        }
        this.apiKey = key;
        this.fetchFn = options.fetchFn ?? defaultFetch;
        this.sleep = options.sleep ?? defaultSleep;
        this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
        this.maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES;
    }

    async chat(req: AIClientRequest): Promise<AIClientResponse> {
        const body: Record<string, unknown> = {
            model: req.model,
            messages: req.messages.map((m: ChatMessage) => ({
                role: m.role,
                content: m.content,
            })),
        };
        if (req.jsonMode) body['response_format'] = { type: 'json_object' };
        if (req.maxTokens !== undefined) body['max_tokens'] = req.maxTokens;

        let attempt = 0;
         
        while (true) {
            try {
                const res = await this.postOnce(body);
                return res;
            } catch (err) {
                if (err instanceof AIAgentError && !this.isRetryable(err)) throw err;
                attempt += 1;
                if (attempt > this.maxRetries) {
                    throw new AIAgentError(
                        'AISA_UNREACHABLE',
                        `AIsa request failed after ${attempt} attempt(s): ${
                            err instanceof Error ? err.message : String(err)
                        }`,
                    );
                }
                await this.sleep(BACKOFF_BASE_MS * 2 ** (attempt - 1));
            }
        }
    }

    /** 429/401/403 are final; everything else may be retried. */
    private isRetryable(err: AIAgentError): boolean {
        return err.code === 'AISA_UNREACHABLE';
    }

    private async postOnce(body: Record<string, unknown>): Promise<AIClientResponse> {
        const controller = new AbortController();

        // The AbortSignal releases well-behaved fetch impls; the race below
        // guarantees settlement even when a custom fetchFn ignores the signal.
        const timeoutError = new AIAgentError(
            'AISA_UNREACHABLE',
            `AIsa request timed out after ${this.timeoutMs}ms.`,
        );
        const timeoutRace = new Promise<never>((_, reject) => {
            const timer = setTimeout(() => {
                controller.abort();
                reject(timeoutError);
            }, this.timeoutMs);
            controller.signal.addEventListener('abort', () => clearTimeout(timer), {
                once: true,
            });
        });

        let res: FetchResponseLike;
        try {
            res = await Promise.race([
                this.fetchFn(AISA_CHAT_URL, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${this.apiKey}`,
                    },
                    body: JSON.stringify(body),
                    signal: controller.signal,
                }),
                timeoutRace,
            ]);
        } catch (err) {
            // Network failure, DNS, timeout, or an already-typed AIsa error.
            if (err instanceof AIAgentError) throw err;
            throw new AIAgentError(
                'AISA_UNREACHABLE',
                `AIsa request failed: ${err instanceof Error ? err.message : String(err)}`,
            );
        }

        if (res.status === 401 || res.status === 403) {
            throw new AIAgentError('AISA_AUTH', `AIsa rejected the API key (HTTP ${res.status}).`);
        }
        if (res.status === 429) {
            throw new AIAgentError('AISA_RATE_LIMIT', 'AIsa rate limit hit (HTTP 429).');
        }
        if (!res.ok) {
            if (isTransientStatus(res.status)) {
                throw new AIAgentError(
                    'AISA_UNREACHABLE',
                    `AIsa transient error (HTTP ${res.status}).`,
                );
            }
            throw new AIAgentError('AISA_UNREACHABLE', `AIsa error (HTTP ${res.status}).`);
        }

        const data = (await res.json()) as AisaSuccessBody;
        const content = data.choices?.[0]?.message?.content;
        if (typeof content !== 'string') {
            throw new AIAgentError('AISA_UNREACHABLE', 'AIsa returned no message content.');
        }
        return {
            content,
            usage: {
                promptTokens: data.usage?.prompt_tokens ?? 0,
                completionTokens: data.usage?.completion_tokens ?? 0,
            },
        };
    }
}
