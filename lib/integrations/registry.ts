/**
 * Action Registry extension for external tools (Workstream C,
 * plan Phase 58 rule: every external tool registers in the existing
 * Action Registry with risk/permissions/approval metadata — no side
 * channels).
 *
 * Each provider tool becomes an ActionDef named
 * `ext.<toolkit>.<TOOL_SLUG>`:
 * - risk: read → low, write → medium, destructive → high
 *   (classifyToolRisk in types.ts; conservative verb heuristic).
 * - permissions: ['external:<toolkit>'] — agents/widgets/games must
 *   hold the toolkit permission (for games/widgets this is the
 *   declared + creator-approved brief capability `apps.invoke` plus
 *   the per-action declaration in brief.externalActions).
 * - execute(): delegates to the executor configured by the
 *   composition root (configureExternalActionExecutor). Unconfigured
 *   => an honest { ok: false } result, never a silent side effect.
 *   Executions still pass through the executor's binding isolation +
 *   approval gating; the registry entry is the catalog/policy face of
 *   the same single path.
 */
import { z } from 'zod';

import type { ActionDef, ActionResult } from '../ai/actions';
import { classifyToolRisk, type ExternalTool, type ExternalToolProvider } from './types';
import type { ExternalExecutionRequest, ExternalExecutionResult } from './executor';

export function externalActionName(toolkitSlug: string, toolSlug: string): string {
    return `ext.${toolkitSlug.toLowerCase()}.${toolSlug}`;
}

export function parseExternalActionName(
    name: string,
): { toolkitSlug: string; toolSlug: string } | null {
    const match = /^ext\.([a-z0-9_]+)\.(.+)$/.exec(name);
    if (!match) return null;
    return { toolkitSlug: match[1], toolSlug: match[2] };
}

type ExternalRunner = (
    req: ExternalExecutionRequest,
) => Promise<ExternalExecutionResult>;

let configuredRunner: ExternalRunner | null = null;

/** Composition root wires the guarded executor here (server startup). */
export function configureExternalActionExecutor(runner: ExternalRunner): void {
    configuredRunner = runner;
}

const RISK_BY_TOOL: Record<string, ActionDef['risk']> = {
    read: 'low',
    write: 'medium',
    destructive: 'high',
};

export function externalToolToActionDef(tool: ExternalTool): ActionDef {
    const risk = classifyToolRisk(tool.slug);
    const name = externalActionName(tool.toolkitSlug, tool.slug);
    return {
        name,
        description:
            tool.description ?? `${tool.name} (${tool.toolkitSlug}) — external tool via integration provider.`,
        risk: RISK_BY_TOOL[risk],
        permissions: [`external:${tool.toolkitSlug.toLowerCase()}`],
        inputSchema: z.object({
            arguments: z.record(z.string(), z.unknown()).default({}),
        }),
        outputSchema: z.object({ ok: z.boolean() }).catchall(z.unknown()),
        idempotent: risk === 'read',
        audit: true,
        execute: async (inputs, ctx): Promise<ActionResult> => {
            if (!configuredRunner) {
                return {
                    ok: false,
                    note: 'External integrations are not configured on this deployment (no provider executor). Nothing was executed.',
                };
            }
            const args =
                inputs && typeof inputs === 'object'
                    ? ((inputs as { arguments?: Record<string, unknown> }).arguments ?? {})
                    : {};
            const result = await configuredRunner({
                clubId: ctx.clubId,
                toolkitSlug: tool.toolkitSlug,
                toolSlug: tool.slug,
                arguments: args,
                via: 'staff',
            });
            if (result.status === 'executed') return { ok: true, data: result.data };
            if (result.status === 'pending_approval') {
                return {
                    ok: false,
                    note: `Write queued for creator approval in the AI Inbox (item ${result.inboxItemId}). Nothing was executed yet.`,
                    data: { pendingApproval: true, inboxItemId: result.inboxItemId },
                };
            }
            return { ok: false, note: `${result.code}: ${result.message}` };
        },
    };
}

/**
 * Discover the ActionDefs for every tool of the given toolkits from
 * the provider. Callers merge these into their registry view (the base
 * ACTION_REGISTRY stays static; external entries are per-deployment
 * dynamic because the provider catalog is).
 */
export async function discoverExternalActionDefs(
    provider: ExternalToolProvider,
    toolkitSlugs: string[],
): Promise<ActionDef[]> {
    const defs: ActionDef[] = [];
    for (const toolkitSlug of toolkitSlugs) {
        const tools = await provider.listTools(toolkitSlug);
        for (const tool of tools) defs.push(externalToolToActionDef(tool));
    }
    return defs;
}
