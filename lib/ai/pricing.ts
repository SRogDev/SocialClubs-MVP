/**
 * Static per-1K-token price table (USD) used to estimate AI cost per call.
 *
 * THESE ARE ESTIMATES, NOT LIVE PRICES. They are the providers' published
 * list prices at implementation time; AIsa may charge differently.
 * Update this table manually when prices change — the runtime never fetches
 * prices from the network (ADR-001 §6).
 */
export interface ModelPrice {
    /** USD per 1,000 input tokens. */
    inputPer1K: number;
    /** USD per 1,000 output tokens. */
    outputPer1K: number;
}

export const MODEL_PRICES_USD_PER_1K: Record<string, ModelPrice> = {
    'openai/gpt-4o-mini': { inputPer1K: 0.00015, outputPer1K: 0.0006 },
    'openai/gpt-4o': { inputPer1K: 0.0025, outputPer1K: 0.01 },
};

/** Conservative fallback for models not in the table — prefer adding a real row. */
export const FALLBACK_PRICE_USD_PER_1K: ModelPrice = { inputPer1K: 0.001, outputPer1K: 0.003 };

export function priceForModel(model: string): ModelPrice {
    return MODEL_PRICES_USD_PER_1K[model] ?? FALLBACK_PRICE_USD_PER_1K;
}

/** Estimated USD cost for one call. Rounds to 6 decimals (sub-cent precision). */
export function estimateCostUsd(
    model: string,
    promptTokens: number,
    completionTokens: number,
): number {
    const price = priceForModel(model);
    const raw =
        (promptTokens / 1000) * price.inputPer1K +
        (completionTokens / 1000) * price.outputPer1K;
    return Math.round(raw * 1e6) / 1e6;
}
