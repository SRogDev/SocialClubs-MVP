/**
 * External app integrations (Workstream C) — provider-agnostic model.
 *
 * One interface, MCP-shaped (list tools / execute tool / manage
 * connections), so providers can be added later without touching
 * callers: Composio is the FIRST provider (lib/integrations/composio.ts),
 * a raw MCP server or another aggregator can implement the same port.
 *
 * Tenancy model (isolation is enforced HERE, not by the provider):
 * - The provider-side `entityId` identifies the CREATOR (the platform
 *   user who OAuth-connected their apps): `sc-user-<platformUserId>`.
 * - Which connections a CLUB may use is decided by our own binding
 *   store (club_external_connections): a club acts through the
 *   connections its creator registered FOR THAT CLUB. Club A's games
 *   and staff can never reach club B's bindings — the executor only
 *   ever resolves through the club's own binding (see executor.ts).
 * - Creators only ever OAuth-connect. Tokens live at the provider;
 *   this codebase never sees or stores them.
 */

export interface ExternalToolkit {
    slug: string;
    name: string;
    description?: string;
    logo?: string | null;
}

export interface ExternalTool {
    slug: string;
    toolkitSlug: string;
    name: string;
    description?: string;
    /** JSON-schema-ish input description, passed through from the provider. */
    inputSchema?: Record<string, unknown>;
}

export type ExternalConnectionStatus =
    | 'initializing'
    | 'initiated'
    | 'active'
    | 'inactive'
    | 'revoked'
    | 'expired'
    | 'unknown';

export interface ExternalConnection {
    id: string;
    entityId: string;
    toolkitSlug: string;
    status: ExternalConnectionStatus;
    createdAt?: string;
}

export interface ConnectLink {
    connectionId: string;
    redirectUrl: string;
}

export interface ExternalExecuteResult {
    successful: boolean;
    data?: unknown;
    error?: string;
}

/**
 * The port every provider implements. All methods take the platform's
 * entityId (never a provider credential — auth is the adapter's job,
 * configured from env by the composition root).
 */
export interface ExternalToolProvider {
    readonly id: string;
    listToolkits(): Promise<ExternalToolkit[]>;
    listTools(toolkitSlug: string): Promise<ExternalTool[]>;
    listConnections(entityId: string, toolkitSlug?: string): Promise<ExternalConnection[]>;
    createConnectLink(input: {
        entityId: string;
        toolkitSlug: string;
        callbackUrl: string;
    }): Promise<ConnectLink>;
    deleteConnection(connectionId: string): Promise<void>;
    executeTool(input: {
        entityId: string;
        toolSlug: string;
        arguments: Record<string, unknown>;
        connectedAccountId?: string;
    }): Promise<ExternalExecuteResult>;
}

export class ExternalProviderError extends Error {
    constructor(
        message: string,
        readonly status?: number,
        readonly providerId?: string,
    ) {
        super(message);
        this.name = 'ExternalProviderError';
    }
}

/** Provider-side entity id for a platform user (the connection owner). */
export function entityIdForUser(platformUserId: string): string {
    return `sc-user-${platformUserId}`;
}

/**
 * Tool risk classification. Providers do not expose a reliable
 * read/write flag, so risk is derived from the tool slug's verb —
 * deliberately conservative: anything not clearly a read is a write,
 * and destructive verbs are called out separately. The registry layer
 * (registry.ts) turns this into Action Registry approval metadata;
 * per-tool overrides can be added there without touching callers.
 */
export type ToolRisk = 'read' | 'write' | 'destructive';

const READ_PREFIXES = [
    'GET_',
    'LIST_',
    'FETCH_',
    'SEARCH_',
    'QUERY_',
    'RETRIEVE_',
    'FIND_',
    'READ_',
    'CHECK_',
    'COMPOSIO_SEARCH_',
];
const DESTRUCTIVE_PREFIXES = ['DELETE_', 'REMOVE_', 'REVOKE_', 'BAN_', 'BLOCK_'];

export function classifyToolRisk(toolSlug: string): ToolRisk {
    const slug = toolSlug.toUpperCase();
    if (DESTRUCTIVE_PREFIXES.some((p) => slug.includes(p))) return 'destructive';
    // Read verbs appear after the toolkit prefix (YOUTUBE_GET_..., etc.)
    if (READ_PREFIXES.some((p) => slug.includes(p))) return 'read';
    return 'write';
}
