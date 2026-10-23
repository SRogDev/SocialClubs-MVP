/**
 * Integration layer tests (Workstream C): Composio adapter wire shape,
 * risk classification, registry extension, and the executor's
 * isolation + approval gating. The core promises under test:
 * - Club A can NEVER execute through club B's connections.
 * - Writes never execute without approval (or an approved workflow).
 * - Destructive actions never execute autonomously.
 */
import { ComposioProvider } from '@/lib/integrations/composio';
import { createInMemoryConnectionStore } from '@/lib/integrations/connections';
import { createExternalExecutor } from '@/lib/integrations/executor';
import { FakeExternalProvider } from '@/lib/integrations/fake';
import {
    discoverExternalActionDefs,
    externalActionName,
    externalToolToActionDef,
    parseExternalActionName,
} from '@/lib/integrations/registry';
import { classifyToolRisk, entityIdForUser } from '@/lib/integrations/types';

function jsonResponse(body: unknown, status = 200): Response {
    // Structural fake: the jsdom jest env has no fetch Response global.
    return {
        ok: status >= 200 && status < 300,
        status,
        json: async () => body,
        text: async () => JSON.stringify(body),
    } as unknown as Response;
}

describe('ComposioProvider (wire shape, fake fetch)', () => {
    it('lists toolkits and sends the project key header', async () => {
        const seen: Array<{ url: string; key: string | null }> = [];
        const provider = new ComposioProvider({
            apiKey: 'test-key',
            fetchFn: async (url, init) => {
                const headers = (init?.headers ?? {}) as Record<string, string>;
                seen.push({ url: String(url), key: headers['x-api-key'] ?? null });
                return jsonResponse({ items: [{ slug: 'youtube', name: 'YouTube' }] });
            },
        });
        const toolkits = await provider.listToolkits();
        expect(toolkits).toEqual([expect.objectContaining({ slug: 'youtube' })]);
        expect(seen[0].url).toContain('/api/v3/toolkits');
        expect(seen[0].key).toBe('test-key');
    });

    it('executes tools with entity + connected account and maps the result', async () => {
        let body: Record<string, unknown> = {};
        const provider = new ComposioProvider({
            apiKey: 'k',
            fetchFn: async (_url, init) => {
                body = JSON.parse(String(init?.body ?? '{}'));
                return jsonResponse({ successful: true, data: { views: 42 } });
            },
        });
        const res = await provider.executeTool({
            entityId: 'sc-user-1',
            toolSlug: 'YOUTUBE_GET_CHANNEL_STATISTICS',
            arguments: { channelId: 'UC1' },
            connectedAccountId: 'ca_1',
        });
        expect(res).toEqual({ successful: true, data: { views: 42 }, error: undefined });
        expect(body).toMatchObject({
            user_id: 'sc-user-1',
            connected_account_id: 'ca_1',
            arguments: { channelId: 'UC1' },
        });
    });

    it('throws a typed error on provider failure', async () => {
        const provider = new ComposioProvider({
            apiKey: 'k',
            fetchFn: async () => jsonResponse({ error: 'nope' }, 403),
        });
        await expect(provider.listToolkits()).rejects.toThrow(/403/);
    });

    it('createConnectLink ensures a managed auth config then mints the link', async () => {
        const calls: string[] = [];
        const provider = new ComposioProvider({
            apiKey: 'k',
            fetchFn: async (url, init) => {
                const u = String(url);
                calls.push(`${init?.method ?? 'GET'} ${u}`);
                if (u.includes('/auth_configs?')) return jsonResponse({ items: [] });
                if (u.endsWith('/auth_configs')) return jsonResponse({ auth_config: { id: 'ac_9' } });
                if (u.endsWith('/connected_accounts/link')) {
                    return jsonResponse({ connected_account_id: 'ca_9', redirect_url: 'https://link.test/9' });
                }
                return jsonResponse({});
            },
        });
        const link = await provider.createConnectLink({
            entityId: 'sc-user-1',
            toolkitSlug: 'youtube',
            callbackUrl: 'https://app.test/callback',
        });
        expect(link).toEqual({ connectionId: 'ca_9', redirectUrl: 'https://link.test/9' });
        expect(calls.some((c) => c.includes('POST'))).toBe(true);
    });
});

describe('classifyToolRisk', () => {
    it('reads are reads, everything else is a write, deletes are destructive', () => {
        expect(classifyToolRisk('YOUTUBE_GET_CHANNEL_STATISTICS')).toBe('read');
        expect(classifyToolRisk('TIKTOK_LIST_VIDEOS')).toBe('read');
        expect(classifyToolRisk('YOUTUBE_CREATE_PLAYLIST')).toBe('write');
        expect(classifyToolRisk('SPOTIFY_ADD_TO_PLAYLIST')).toBe('write');
        expect(classifyToolRisk('YOUTUBE_DELETE_VIDEO')).toBe('destructive');
    });
});

describe('registry extension', () => {
    it('names round-trip and risks map to registry levels', () => {
        const name = externalActionName('youtube', 'YOUTUBE_GET_CHANNEL_STATISTICS');
        expect(name).toBe('ext.youtube.YOUTUBE_GET_CHANNEL_STATISTICS');
        expect(parseExternalActionName(name)).toEqual({
            toolkitSlug: 'youtube',
            toolSlug: 'YOUTUBE_GET_CHANNEL_STATISTICS',
        });
        expect(parseExternalActionName('send_message')).toBeNull();
    });

    it('builds ActionDefs with permissions and audit from provider tools', async () => {
        const defs = await discoverExternalActionDefs(new FakeExternalProvider(), ['youtube']);
        const byName = new Map(defs.map((d) => [d.name, d]));
        expect(byName.get('ext.youtube.YOUTUBE_GET_CHANNEL_STATISTICS')).toMatchObject({
            risk: 'low',
            permissions: ['external:youtube'],
            audit: true,
        });
        expect(byName.get('ext.youtube.YOUTUBE_CREATE_PLAYLIST')).toMatchObject({ risk: 'medium' });
        expect(byName.get('ext.youtube.YOUTUBE_DELETE_VIDEO')).toMatchObject({ risk: 'high' });
    });

    it('an unconfigured registry executor refuses honestly (no side effect)', async () => {
        const def = externalToolToActionDef({
            slug: 'YOUTUBE_GET_CHANNEL_STATISTICS',
            toolkitSlug: 'youtube',
            name: 'stats',
        });
        const result = await def.execute(
            { arguments: {} },
            { clubId: 'c1', agentId: 'a', action: def.name, idempotencyKey: 'k', db: {} as never, now: () => new Date() },
        );
        expect(result.ok).toBe(false);
        expect(result.note).toMatch(/not configured/);
    });
});

describe('executor: isolation + approval gating', () => {
    async function setup() {
        const provider = new FakeExternalProvider();
        const connections = createInMemoryConnectionStore();
        const approvals: unknown[] = [];
        const executor = createExternalExecutor({
            provider,
            connections,
            async requestApproval(input) {
                approvals.push(input);
                return 'inbox-1';
            },
        });
        // Creator U1 connects YouTube FOR club A only.
        const link = await provider.createConnectLink({
            entityId: entityIdForUser('creator-1'),
            toolkitSlug: 'youtube',
            callbackUrl: 'https://app.test/cb',
        });
        await connections.upsertBinding({
            clubId: 'club-a',
            creatorUserId: 'creator-1',
            toolkitSlug: 'youtube',
            connectedAccountId: link.connectionId,
        });
        return { provider, connections, executor, approvals };
    }

    it('reads execute through the club binding (creator entity + account)', async () => {
        const { provider, executor } = await setup();
        const res = await executor.execute({
            clubId: 'club-a',
            toolkitSlug: 'youtube',
            toolSlug: 'YOUTUBE_GET_CHANNEL_STATISTICS',
            arguments: {},
            via: 'game',
        });
        expect(res.status).toBe('executed');
        expect(provider.executions).toHaveLength(1);
        expect(provider.executions[0].entityId).toBe('sc-user-creator-1');
        expect(provider.executions[0].connectedAccountId).toBe('fake-conn-1');
    });

    it('club B can never execute through club A connections', async () => {
        const { provider, executor } = await setup();
        const res = await executor.execute({
            clubId: 'club-b',
            toolkitSlug: 'youtube',
            toolSlug: 'YOUTUBE_GET_CHANNEL_STATISTICS',
            arguments: {},
            via: 'game',
        });
        expect(res).toMatchObject({ status: 'refused', code: 'NOT_CONNECTED' });
        expect(provider.executions).toHaveLength(0);
    });

    it('writes queue for inbox approval and do NOT execute', async () => {
        const { provider, executor, approvals } = await setup();
        const res = await executor.execute({
            clubId: 'club-a',
            toolkitSlug: 'youtube',
            toolSlug: 'YOUTUBE_CREATE_PLAYLIST',
            arguments: { title: 'Nueva lista' },
            via: 'widget',
        });
        expect(res).toMatchObject({ status: 'pending_approval', inboxItemId: 'inbox-1' });
        expect(provider.executions).toHaveLength(0);
        expect(approvals).toHaveLength(1);
    });

    it('writes execute inside a creator-approved workflow or after inbox approval', async () => {
        const { provider, executor } = await setup();
        const viaWorkflow = await executor.execute({
            clubId: 'club-a',
            toolkitSlug: 'youtube',
            toolSlug: 'YOUTUBE_CREATE_PLAYLIST',
            arguments: { title: 'WF' },
            via: 'staff',
            approvedWorkflowId: 'wf-1',
        });
        expect(viaWorkflow.status).toBe('executed');
        const viaInbox = await executor.execute({
            clubId: 'club-a',
            toolkitSlug: 'youtube',
            toolSlug: 'YOUTUBE_CREATE_PLAYLIST',
            arguments: { title: 'Inbox' },
            via: 'staff',
            inboxApproved: true,
        });
        expect(viaInbox.status).toBe('executed');
        expect(provider.executions).toHaveLength(2);
    });

    it('destructive actions never execute autonomously, even in workflows', async () => {
        const { provider, executor } = await setup();
        const res = await executor.execute({
            clubId: 'club-a',
            toolkitSlug: 'youtube',
            toolSlug: 'YOUTUBE_DELETE_VIDEO',
            arguments: { videoId: 'v1' },
            via: 'staff',
            approvedWorkflowId: 'wf-1',
        });
        expect(res.status).toBe('pending_approval');
        expect(provider.executions).toHaveLength(0);
    });
});
