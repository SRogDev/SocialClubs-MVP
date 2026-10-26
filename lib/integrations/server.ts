/**
 * Composition root for external integrations (Workstream C).
 * Server-only: resolves the configured provider + bindings + guarded
 * executor, or null when no provider is configured (COMPOSIO_API_KEY
 * absent) — every surface treats null as "feature off" and hides.
 */
import { composioFromEnv, type ComposioProvider } from './composio';
import { supabaseConnectionStore, type ClubConnectionStore } from './connections';
import { createExternalExecutor, type ExternalExecutor } from './executor';
import { configureExternalActionExecutor, externalActionName } from './registry';

export interface IntegrationsRuntime {
    provider: ComposioProvider;
    connections: ClubConnectionStore;
    executor: ExternalExecutor;
}

let cached: IntegrationsRuntime | null | undefined;

export function resolveIntegrations(): IntegrationsRuntime | null {
    if (cached !== undefined) return cached;
    const provider = composioFromEnv();
    if (!provider) {
        cached = null;
        return null;
    }
    const connections = supabaseConnectionStore();
    const executor = createExternalExecutor({
        provider,
        connections,
        async requestApproval(input) {
            const { supabaseVerifyDb } = await import('../ai/verify');
            const row = await supabaseVerifyDb().insertAction({
                clubId: input.clubId,
                agentId: 'external-apps',
                action: externalActionName(input.toolkitSlug, input.toolSlug),
                inputs: { arguments: input.arguments, via: input.via },
                idempotencyKey: `ext-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
                status: 'pending_approval',
            });
            return row.id;
        },
    });
    // The Action Registry's external defs execute through this same
    // guarded executor — one path, no side channels.
    configureExternalActionExecutor((req) => executor.execute(req));
    cached = { provider, connections, executor };
    return cached;
}
