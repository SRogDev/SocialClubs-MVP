/**
 * Model routing: tier -> AIsa model id (ADR-001 §2, plan Phase 70).
 *
 * - fast:     classification, FAQ retrieval — cheapest capable model.
 * - smart:    composition, reasoning — stronger model.
 * - reviewer: verification passes — strong model, may equal smart.
 *
 * Model ids are env-configurable. The defaults below are sensible public
 * model ids but are NOT verified against AIsa's live catalog — confirm them
 * against AIsa's model list before relying on them in production
 * (ADR-001 §6 explicitly leaves exact ids to implementation time).
 */
import type { ModelTier } from './types';

export const AISA_MODEL_FAST = 'AISA_MODEL_FAST';
export const AISA_MODEL_SMART = 'AISA_MODEL_SMART';
export const AISA_MODEL_REVIEWER = 'AISA_MODEL_REVIEWER';

/**
 * Built-in defaults, used only when the env vars are unset.
 * Verify against AIsa's /models list before production use.
 */
export const MODEL_DEFAULTS: Record<ModelTier, string> = {
    fast: 'openai/gpt-4o-mini',
    smart: 'openai/gpt-4o',
    reviewer: 'openai/gpt-4o',
};

const TIER_ENV: Record<ModelTier, string> = {
    fast: AISA_MODEL_FAST,
    smart: AISA_MODEL_SMART,
    reviewer: AISA_MODEL_REVIEWER,
};

/** Resolve the model id for a tier: env override first, documented default otherwise. */
export function modelForTier(tier: ModelTier): string {
    const fromEnv = process.env[TIER_ENV[tier]];
    if (fromEnv && fromEnv.trim().length > 0) return fromEnv.trim();
    return MODEL_DEFAULTS[tier];
}
