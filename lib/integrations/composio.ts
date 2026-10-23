/**
 * Composio provider adapter (Workstream C) — implements
 * ExternalToolProvider over Composio's REST API v3.
 *
 * Verified against official Composio docs on 2026-10-23 (see
 * docs/INTEGRATIONS.md for the full findings):
 * - Base URL: https://backend.composio.dev/api/v3; auth header
 *   `x-api-key: <COMPOSIO_API_KEY>` (project key; creators never see it).
 * - Toolkits (apps): GET /toolkits, GET /toolkits/{slug}.
 * - Tools: GET /tools?toolkit_slug=<slug>.
 * - Auth configs: GET /auth_configs?toolkit_slug=<slug>; creation with
 *   `use_composio_managed_auth: true` uses Composio's own OAuth apps,
 *   so creators only click through a hosted consent (Connect Link).
 * - Connected accounts: POST /connected_accounts/link
 *   { user_id, auth_config_id, callback_url } -> { connected_account_id,
 *   redirect_url }; GET /connected_accounts?user_ids[]=..&toolkit_slugs[]=..;
 *   DELETE /connected_accounts/{id}. Statuses: INITIALIZING / INITIATED /
 *   ACTIVE / INACTIVE / REVOKED (links expire after ~10 minutes).
 * - Execution: POST /tools/execute/{TOOL_SLUG}
 *   { user_id, arguments, connected_account_id? }
 *   -> { successful, data, error }.
 * - MCP: Composio also exposes Tool Router sessions (per-user MCP URL +
 *   headers). We deliberately start with the REST execution path: the
 *   provider port is MCP-shaped, and a session-based transport can be
 *   added behind the same interface without touching callers.
 *
 * No SDK dependency: plain fetch, injectable for tests. Credentials are
 * read from env by composioFromEnv(); ABSENT KEY => null provider, and
 * the whole integrations surface hides itself (graceful absence).
 */
import {
    ExternalProviderError,
    type ConnectLink,
    type ExternalConnection,
    type ExternalConnectionStatus,
    type ExternalExecuteResult,
    type ExternalTool,
    type ExternalToolkit,
    type ExternalToolProvider,
} from './types';

export const COMPOSIO_DEFAULT_BASE = 'https://backend.composio.dev/api/v3';

type FetchFn = (url: string, init?: RequestInit) => Promise<Response>;

export interface ComposioConfig {
    apiKey: string;
    baseUrl?: string;
    fetchFn?: FetchFn;
}

interface ComposioEnvelope<T> {
    items?: T[];
    data?: T;
}

export class ComposioProvider implements ExternalToolProvider {
    readonly id = 'composio';
    private readonly base: string;
    private readonly fetchFn: FetchFn;

    constructor(private readonly config: ComposioConfig) {
        this.base = (config.baseUrl ?? COMPOSIO_DEFAULT_BASE).replace(/\/$/, '');
        this.fetchFn = config.fetchFn ?? ((url, init) => fetch(url, init));
    }

    private async request<T>(path: string, init?: RequestInit): Promise<T> {
        const res = await this.fetchFn(`${this.base}${path}`, {
            ...init,
            headers: {
                'x-api-key': this.config.apiKey,
                'Content-Type': 'application/json',
                ...(init?.headers ?? {}),
            },
        });
        if (!res.ok) {
            const body = await res.text().catch(() => '');
            throw new ExternalProviderError(
                `Composio ${init?.method ?? 'GET'} ${path} failed (${res.status}): ${body.slice(0, 300)}`,
                res.status,
                this.id,
            );
        }
        return (await res.json()) as T;
    }

    async listToolkits(): Promise<ExternalToolkit[]> {
        const page = await this.request<ComposioEnvelope<Record<string, unknown>>>(
            '/toolkits?limit=500',
        );
        const items = page.items ?? [];
        return items.map((t) => ({
            slug: String(t.slug ?? ''),
            name: String(t.name ?? t.slug ?? ''),
            description: typeof t.description === 'string' ? t.description : undefined,
            logo: typeof t.logo === 'string' ? t.logo : null,
        }));
    }

    async listTools(toolkitSlug: string): Promise<ExternalTool[]> {
        const page = await this.request<ComposioEnvelope<Record<string, unknown>>>(
            `/tools?toolkit_slug=${encodeURIComponent(toolkitSlug)}&limit=500`,
        );
        const items = page.items ?? [];
        return items.map((t) => ({
            slug: String(t.slug ?? ''),
            toolkitSlug,
            name: String(t.name ?? t.slug ?? ''),
            description: typeof t.description === 'string' ? t.description : undefined,
            inputSchema:
                t.input_parameters && typeof t.input_parameters === 'object'
                    ? (t.input_parameters as Record<string, unknown>)
                    : undefined,
        }));
    }

    async listConnections(
        entityId: string,
        toolkitSlug?: string,
    ): Promise<ExternalConnection[]> {
        const params = new URLSearchParams();
        params.append('user_ids[]', entityId);
        if (toolkitSlug) params.append('toolkit_slugs[]', toolkitSlug);
        const page = await this.request<ComposioEnvelope<Record<string, unknown>>>(
            `/connected_accounts?${params.toString()}`,
        );
        const items = page.items ?? [];
        return items.map((c) => ({
            id: String(c.id ?? c.nanoid ?? ''),
            entityId,
            toolkitSlug: String(
                (c.toolkit as Record<string, unknown> | undefined)?.slug ?? toolkitSlug ?? '',
            ),
            status: mapStatus(c.status),
            createdAt: typeof c.created_at === 'string' ? c.created_at : undefined,
        }));
    }

    /**
     * Start an OAuth connection: ensure an auth config exists for the
     * toolkit (Composio-managed auth preferred), then mint a hosted
     * Connect Link for the entity. The creator only completes consent
     * on the provider's page; tokens never touch this codebase.
     */
    async createConnectLink(input: {
        entityId: string;
        toolkitSlug: string;
        callbackUrl: string;
    }): Promise<ConnectLink> {
        const authConfigId = await this.ensureAuthConfig(input.toolkitSlug);
        const res = await this.request<Record<string, unknown>>('/connected_accounts/link', {
            method: 'POST',
            body: JSON.stringify({
                user_id: input.entityId,
                auth_config_id: authConfigId,
                callback_url: input.callbackUrl,
            }),
        });
        const redirectUrl = String(res.redirect_url ?? res.redirectUrl ?? '');
        const connectionId = String(
            res.connected_account_id ?? res.connectedAccountId ?? res.id ?? '',
        );
        if (!redirectUrl) {
            throw new ExternalProviderError(
                'Composio link response did not include a redirect_url',
                undefined,
                this.id,
            );
        }
        return { connectionId, redirectUrl };
    }

    private async ensureAuthConfig(toolkitSlug: string): Promise<string> {
        const page = await this.request<ComposioEnvelope<Record<string, unknown>>>(
            `/auth_configs?toolkit_slug=${encodeURIComponent(toolkitSlug)}`,
        );
        const existing = (page.items ?? [])[0];
        if (existing?.id) return String(existing.id);
        const created = await this.request<Record<string, unknown>>('/auth_configs', {
            method: 'POST',
            body: JSON.stringify({
                toolkit: { slug: toolkitSlug },
                auth_config: {
                    type: 'use_composio_managed_auth',
                    name: `socialclubs-${toolkitSlug}`,
                },
            }),
        });
        const id = String(
            (created.auth_config as Record<string, unknown> | undefined)?.id ?? created.id ?? '',
        );
        if (!id) {
            throw new ExternalProviderError(
                `Could not create an auth config for toolkit ${toolkitSlug}`,
                undefined,
                this.id,
            );
        }
        return id;
    }

    async deleteConnection(connectionId: string): Promise<void> {
        await this.request(`/connected_accounts/${encodeURIComponent(connectionId)}`, {
            method: 'DELETE',
        });
    }

    async executeTool(input: {
        entityId: string;
        toolSlug: string;
        arguments: Record<string, unknown>;
        connectedAccountId?: string;
    }): Promise<ExternalExecuteResult> {
        const res = await this.request<Record<string, unknown>>(
            `/tools/execute/${encodeURIComponent(input.toolSlug)}`,
            {
                method: 'POST',
                body: JSON.stringify({
                    user_id: input.entityId,
                    arguments: input.arguments,
                    ...(input.connectedAccountId
                        ? { connected_account_id: input.connectedAccountId }
                        : {}),
                }),
            },
        );
        return {
            successful: res.successful === true,
            data: res.data,
            error:
                typeof res.error === 'string'
                    ? res.error
                    : res.error
                      ? JSON.stringify(res.error).slice(0, 500)
                      : undefined,
        };
    }
}

function mapStatus(raw: unknown): ExternalConnectionStatus {
    switch (String(raw ?? '').toUpperCase()) {
        case 'ACTIVE':
            return 'active';
        case 'INITIALIZING':
            return 'initializing';
        case 'INITIATED':
            return 'initiated';
        case 'INACTIVE':
            return 'inactive';
        case 'REVOKED':
            return 'revoked';
        case 'EXPIRED':
        case 'FAILED':
            return 'expired';
        default:
            return 'unknown';
    }
}

/**
 * Composition-root factory: returns null when COMPOSIO_API_KEY is not
 * configured — the integrations surface treats null as "feature off".
 */
export function composioFromEnv(): ComposioProvider | null {
    const apiKey = process.env.COMPOSIO_API_KEY?.trim();
    if (!apiKey) return null;
    return new ComposioProvider({
        apiKey,
        baseUrl: process.env.COMPOSIO_API_BASE?.trim() || undefined,
    });
}
