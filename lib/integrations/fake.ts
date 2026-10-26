/**
 * Deterministic fake ExternalToolProvider for tests, demos and evals.
 * Records every execution so tests can assert exactly what would have
 * reached the provider (and, more importantly, what must NOT reach it
 * when approval gating or isolation rules block a call).
 */
import type {
    ConnectLink,
    ExternalConnection,
    ExternalExecuteResult,
    ExternalTool,
    ExternalToolkit,
    ExternalToolProvider,
} from './types';

export interface FakeProviderSeed {
    toolkits?: ExternalToolkit[];
    tools?: Record<string, ExternalTool[]>;
}

export class FakeExternalProvider implements ExternalToolProvider {
    readonly id = 'fake';
    readonly executions: Array<{
        entityId: string;
        toolSlug: string;
        arguments: Record<string, unknown>;
        connectedAccountId?: string;
    }> = [];
    private connections: ExternalConnection[] = [];
    private seq = 0;

    constructor(private readonly seed: FakeProviderSeed = {}) {}

    async listToolkits(): Promise<ExternalToolkit[]> {
        return this.seed.toolkits ?? [
            { slug: 'youtube', name: 'YouTube' },
            { slug: 'spotify', name: 'Spotify' },
            { slug: 'googlesheets', name: 'Google Sheets' },
        ];
    }

    async listTools(toolkitSlug: string): Promise<ExternalTool[]> {
        if (this.seed.tools?.[toolkitSlug]) return this.seed.tools[toolkitSlug];
        if (toolkitSlug === 'youtube') {
            return [
                { slug: 'YOUTUBE_GET_CHANNEL_STATISTICS', toolkitSlug, name: 'Get channel statistics' },
                { slug: 'YOUTUBE_CREATE_PLAYLIST', toolkitSlug, name: 'Create playlist' },
                { slug: 'YOUTUBE_DELETE_VIDEO', toolkitSlug, name: 'Delete video' },
            ];
        }
        return [];
    }

    async listConnections(entityId: string, toolkitSlug?: string): Promise<ExternalConnection[]> {
        return this.connections.filter(
            (c) => c.entityId === entityId && (!toolkitSlug || c.toolkitSlug === toolkitSlug),
        );
    }

    async createConnectLink(input: {
        entityId: string;
        toolkitSlug: string;
        callbackUrl: string;
    }): Promise<ConnectLink> {
        const connection: ExternalConnection = {
            id: `fake-conn-${++this.seq}`,
            entityId: input.entityId,
            toolkitSlug: input.toolkitSlug,
            status: 'active',
        };
        this.connections.push(connection);
        return {
            connectionId: connection.id,
            redirectUrl: `https://connect.example.test/${connection.id}?next=${encodeURIComponent(input.callbackUrl)}`,
        };
    }

    async deleteConnection(connectionId: string): Promise<void> {
        this.connections = this.connections.filter((c) => c.id !== connectionId);
    }

    async executeTool(input: {
        entityId: string;
        toolSlug: string;
        arguments: Record<string, unknown>;
        connectedAccountId?: string;
    }): Promise<ExternalExecuteResult> {
        this.executions.push(input);
        return {
            successful: true,
            data: { echo: input.toolSlug, arguments: input.arguments },
        };
    }
}
