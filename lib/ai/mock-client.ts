/**
 * Deterministic mock AI client (ADR-001 §1).
 *
 * Used by the runtime whenever AISA_API_KEY is absent, so dev, test and CI
 * work fully offline. Implements the same AIClient interface as AISAClient:
 * returns canned, schema-valid JSON, reports zero tokens, and sets
 * `mock: true` on both the client and the returned usage trace.
 *
 * The canned payload is generated from the request's zod outputSchema by
 * echoing field names with placeholder values — deterministic across calls.
 */
import type { z } from 'zod';

import type { AIClient, AIClientRequest, AIClientResponse } from './types';

/**
 * Structural view of the zod schema internals this walker needs.
 * Accessing `_zod.def` is version-coupled (verified against zod 4.3.5);
 * if a zod major upgrade changes these internals, this file is the one
 * place to update. Unknown shapes degrade to `null`, never throw.
 */
interface ZodDefView {
    type: string;
    shape?: Record<string, z.ZodType<unknown>>;
    element?: z.ZodType<unknown>;
    entries?: Record<string, string>;
    values?: unknown[];
    options?: z.ZodType<unknown>[];
    innerType?: z.ZodType<unknown>;
    valueType?: z.ZodType<unknown>;
}

interface ZodInternalsView {
    _zod: { def: ZodDefView };
}

function defOf(schema: z.ZodType<unknown>): ZodDefView | null {
    const internals = schema as unknown as Partial<ZodInternalsView>;
    const def = internals._zod?.def;
    return def && typeof def.type === 'string' ? def : null;
}

/** Deterministic canned value for one zod schema node. `name` is the field name when known. */
function cannedFor(schema: z.ZodType<unknown>, name: string | null): unknown {
    const def = defOf(schema);
    if (!def) return null;

    switch (def.type) {
        case 'string':
            return name ? `mock:${name}` : 'mock';
        case 'number':
            return 0;
        case 'boolean':
            return false;
        case 'bigint':
            return '0';
        case 'date':
            return new Date(0).toISOString();
        case 'array': {
            if (!def.element) return [];
            return [cannedFor(def.element, null)];
        }
        case 'object': {
            const shape = def.shape ?? {};
            const out: Record<string, unknown> = {};
            for (const key of Object.keys(shape)) {
                out[key] = cannedFor(shape[key] as z.ZodType<unknown>, key);
            }
            return out;
        }
        case 'enum': {
            const values = Object.values(def.entries ?? {});
            return values.length > 0 ? values[0] : null;
        }
        case 'literal': {
            return def.values && def.values.length > 0 ? def.values[0] : null;
        }
        case 'union':
        case 'discriminated_union': {
            const first = def.options?.[0];
            return first ? cannedFor(first, name) : null;
        }
        case 'optional':
        case 'nullable':
        case 'default':
        case 'readonly':
        case 'nonoptional':
        case 'catch': {
            return def.innerType ? cannedFor(def.innerType, name) : null;
        }
        case 'record': {
            return def.valueType ? { mock_key: cannedFor(def.valueType, null) } : {};
        }
        case 'tuple': {
            const items = (def as unknown as { items?: z.ZodType<unknown>[] }).items;
            return (items ?? []).map((item) => cannedFor(item, null));
        }
        default:
            // Unknown / future zod node types: valid JSON, honestly empty.
            return null;
    }
}

/** Build a deterministic, schema-shaped canned value. Exported for tests. */
export function cannedFromSchema(schema: z.ZodType<unknown>): unknown {
    return cannedFor(schema, null);
}

export class MockAIClient implements AIClient {
    readonly mock = true;

    async chat(req: AIClientRequest): Promise<AIClientResponse> {
        const payload = req.outputSchema ? cannedFromSchema(req.outputSchema) : { ok: true };
        return {
            content: JSON.stringify(payload),
            usage: { promptTokens: 0, completionTokens: 0 },
        };
    }
}
