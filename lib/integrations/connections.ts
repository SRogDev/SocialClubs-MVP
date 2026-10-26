/**
 * Club ↔ external connection bindings (Workstream C).
 *
 * The provider knows CONNECTIONS (creator ↔ app). Only this store knows
 * which connections a CLUB may act through: when a creator connects an
 * app "for club X", a binding row (club_id, creator_user_id, toolkit,
 * connected_account_id) is written here. Every execution resolves its
 * connected account through the club's binding — that is the isolation
 * boundary: no binding, no access, regardless of what the creator
 * connected elsewhere.
 *
 * Supabase table: club_external_connections (migration
 * 20261023000002_external_integrations.sql), RLS on, service-role only.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export interface ClubConnectionBinding {
    clubId: string;
    creatorUserId: string;
    toolkitSlug: string;
    connectedAccountId: string;
    status: 'active' | 'inactive';
    createdAt: string;
    updatedAt: string;
}

export interface ClubConnectionStore {
    getBinding(clubId: string, toolkitSlug: string): Promise<ClubConnectionBinding | null>;
    listBindings(clubId: string): Promise<ClubConnectionBinding[]>;
    upsertBinding(
        binding: Omit<ClubConnectionBinding, 'createdAt' | 'updatedAt' | 'status'> & {
            status?: 'active' | 'inactive';
        },
    ): Promise<ClubConnectionBinding>;
    removeBinding(clubId: string, toolkitSlug: string): Promise<void>;
}

export function createInMemoryConnectionStore(): ClubConnectionStore {
    const map = new Map<string, ClubConnectionBinding>();
    const key = (clubId: string, toolkit: string) => `${clubId}|${toolkit}`;
    return {
        async getBinding(clubId, toolkitSlug) {
            return map.get(key(clubId, toolkitSlug)) ?? null;
        },
        async listBindings(clubId) {
            return [...map.values()].filter((b) => b.clubId === clubId);
        },
        async upsertBinding(binding) {
            const now = new Date().toISOString();
            const full: ClubConnectionBinding = {
                status: 'active',
                createdAt: map.get(key(binding.clubId, binding.toolkitSlug))?.createdAt ?? now,
                ...binding,
                updatedAt: now,
            };
            map.set(key(binding.clubId, binding.toolkitSlug), full);
            return full;
        },
        async removeBinding(clubId, toolkitSlug) {
            map.delete(key(clubId, toolkitSlug));
        },
    };
}

export function supabaseConnectionStore(client?: SupabaseClient): ClubConnectionStore {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!client && (!url || !key)) {
        throw new Error('Supabase service client is not configured (integrations)');
    }
    /* eslint-disable @typescript-eslint/no-explicit-any */
    const sb = (client ?? createClient(url!, key!, { auth: { persistSession: false } })) as any;
    const mapRow = (r: any): ClubConnectionBinding => ({
        clubId: r.club_id,
        creatorUserId: r.creator_user_id,
        toolkitSlug: r.toolkit_slug,
        connectedAccountId: r.connected_account_id,
        status: r.status,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
    });
    return {
        async getBinding(clubId, toolkitSlug) {
            const { data } = await sb
                .from('club_external_connections')
                .select('*')
                .eq('club_id', clubId)
                .eq('toolkit_slug', toolkitSlug)
                .maybeSingle();
            return data ? mapRow(data) : null;
        },
        async listBindings(clubId) {
            const { data } = await sb
                .from('club_external_connections')
                .select('*')
                .eq('club_id', clubId);
            return (data ?? []).map(mapRow);
        },
        async upsertBinding(binding) {
            const { data, error } = await sb
                .from('club_external_connections')
                .upsert(
                    {
                        club_id: binding.clubId,
                        creator_user_id: binding.creatorUserId,
                        toolkit_slug: binding.toolkitSlug,
                        connected_account_id: binding.connectedAccountId,
                        status: binding.status ?? 'active',
                        updated_at: new Date().toISOString(),
                    },
                    { onConflict: 'club_id,toolkit_slug' },
                )
                .select('*')
                .single();
            if (error) throw new Error(`club_external_connections upsert failed: ${error.message}`);
            return mapRow(data);
        },
        async removeBinding(clubId, toolkitSlug) {
            await sb
                .from('club_external_connections')
                .delete()
                .eq('club_id', clubId)
                .eq('toolkit_slug', toolkitSlug);
        },
    };
    /* eslint-enable @typescript-eslint/no-explicit-any */
}
