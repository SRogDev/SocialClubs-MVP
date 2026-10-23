/**
 * Guarded external-action executor (Workstream C) — the ONLY runtime
 * path from club surfaces (AI staff, widgets, games) to a connected
 * app. There are no side channels:
 *
 * 1. The action must be REGISTERED (registry.ts builds ActionDefs for
 *    provider tools; unknown tool slugs are refused).
 * 2. The club must have an ACTIVE binding for the toolkit
 *    (connections.ts) — this is the per-club isolation boundary: the
 *    executor executes with the binding's creator entity + connected
 *    account, never with anything the caller supplies.
 * 3. Reads (risk 'read') execute immediately once declared/approved at
 *    the surface level (game/widget brief, staff policy).
 * 4. Writes require approval: without an approved-workflow context the
 *    call is converted into an AI Inbox approval request and NOTHING
 *    executes (`status: 'pending_approval'`). Inside a creator-approved
 *    workflow (or after the creator approves the inbox item, which
 *    re-invokes with `inboxApproved: true`), the write executes.
 * 5. Destructive tools always need the inbox path (never autonomous).
 * 6. Every attempt (allowed, gated, refused) is audited.
 *
 * Approval defaults live in INTEGRATION_POLICY and are configurable —
 * the creator-facing settings bind to these knobs, not to code.
 */
import { classifyToolRisk, entityIdForUser, type ExternalToolProvider } from './types';
import type { ClubConnectionStore } from './connections';

export const INTEGRATION_POLICY = {
    /** Writes from games/widgets/staff queue for inbox approval by default. */
    writesRequireApproval: true,
    /** Destructive actions can never run inside approved workflows. */
    destructiveRequiresApproval: true,
    /** Per club+toolkit executions per minute (reads + writes). */
    rateLimitPerMinute: 30,
} as const;

export interface ExternalExecutionRequest {
    clubId: string;
    toolkitSlug: string;
    toolSlug: string;
    arguments: Record<string, unknown>;
    /** Who is calling: ai staff, a game, a widget, or the creator directly. */
    via: 'staff' | 'game' | 'widget' | 'creator';
    /** Set when the call happens inside a creator-approved workflow run. */
    approvedWorkflowId?: string;
    /** Set when re-invoked after the creator approved the inbox item. */
    inboxApproved?: boolean;
}

export type ExternalExecutionResult =
    | { status: 'executed'; data: unknown }
    | { status: 'pending_approval'; inboxItemId: string }
    | { status: 'refused'; code: string; message: string };

export interface ExternalExecutorDeps {
    provider: ExternalToolProvider;
    connections: ClubConnectionStore;
    /** Enqueue an approval request in the AI Inbox; returns its item id. */
    requestApproval(input: {
        clubId: string;
        toolkitSlug: string;
        toolSlug: string;
        arguments: Record<string, unknown>;
        via: ExternalExecutionRequest['via'];
    }): Promise<string>;
    audit?(entry: {
        clubId: string;
        toolkitSlug: string;
        toolSlug: string;
        via: ExternalExecutionRequest['via'];
        outcome: string;
    }): Promise<void>;
    now?: () => Date;
    policy?: Partial<typeof INTEGRATION_POLICY>;
}

export function createExternalExecutor(deps: ExternalExecutorDeps) {
    const policy = { ...INTEGRATION_POLICY, ...(deps.policy ?? {}) };
    const now = deps.now ?? (() => new Date());
    const windows = new Map<string, number[]>();

    function rateLimited(clubId: string, toolkitSlug: string): boolean {
        const key = `${clubId}|${toolkitSlug}`;
        const t = now().getTime();
        const window = (windows.get(key) ?? []).filter((ts) => t - ts < 60_000);
        window.push(t);
        windows.set(key, window);
        return window.length > policy.rateLimitPerMinute;
    }

    async function audit(
        req: ExternalExecutionRequest,
        outcome: string,
    ): Promise<void> {
        try {
            await deps.audit?.({
                clubId: req.clubId,
                toolkitSlug: req.toolkitSlug,
                toolSlug: req.toolSlug,
                via: req.via,
                outcome,
            });
        } catch {
            /* audit is best-effort */
        }
    }

    async function execute(req: ExternalExecutionRequest): Promise<ExternalExecutionResult> {
        const binding = await deps.connections.getBinding(req.clubId, req.toolkitSlug);
        if (!binding || binding.status !== 'active') {
            await audit(req, 'not_connected');
            return {
                status: 'refused',
                code: 'NOT_CONNECTED',
                message: 'Este club no tiene conectada esa aplicación.',
            };
        }
        if (rateLimited(req.clubId, req.toolkitSlug)) {
            await audit(req, 'rate_limited');
            return {
                status: 'refused',
                code: 'RATE_LIMITED',
                message: 'Demasiadas llamadas a la aplicación. Espera un momento.',
            };
        }

        const risk = classifyToolRisk(req.toolSlug);
        const needsApproval =
            risk !== 'read' &&
            ((risk === 'destructive' && policy.destructiveRequiresApproval) ||
                (policy.writesRequireApproval && !req.approvedWorkflowId)) &&
            !req.inboxApproved;

        if (needsApproval) {
            const inboxItemId = await deps.requestApproval({
                clubId: req.clubId,
                toolkitSlug: req.toolkitSlug,
                toolSlug: req.toolSlug,
                arguments: req.arguments,
                via: req.via,
            });
            await audit(req, 'pending_approval');
            return { status: 'pending_approval', inboxItemId };
        }

        const result = await deps.provider.executeTool({
            entityId: entityIdForUser(binding.creatorUserId),
            toolSlug: req.toolSlug,
            arguments: req.arguments,
            connectedAccountId: binding.connectedAccountId,
        });
        await audit(req, result.successful ? 'executed' : 'provider_error');
        if (!result.successful) {
            return {
                status: 'refused',
                code: 'PROVIDER_ERROR',
                message: result.error ?? 'La aplicación devolvió un error.',
            };
        }
        return { status: 'executed', data: result.data };
    }

    return { execute };
}

export type ExternalExecutor = ReturnType<typeof createExternalExecutor>;
