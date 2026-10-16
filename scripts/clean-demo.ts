#!/usr/bin/env ts-node
/**
 * Demo cleanup for SocialClubs — `npm run clean:demo`
 *
 * Removes EVERYTHING created by `npm run seed-demo.ts`:
 *
 *   1. All clubs with is_demo = TRUE (posts, polls, events, RSVPs, ai_actions,
 *      member_signals, moderation_events, club_ai_config, memberships and
 *      widget instances are deleted by ON DELETE CASCADE).
 *   2. All public.users rows whose auth user has an @demo.socialclubs email.
 *   3. All auth.users with an @demo.socialclubs email (Admin API).
 *
 * Only touches rows matching the demo markers — real data is never deleted.
 * SAFETY: refuses to run when NODE_ENV=production unless DEMO_ALLOW_PROD=1.
 *
 * Env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const DEMO_EMAIL_DOMAIN = 'demo.socialclubs';

function assertDemoAllowed(): void {
    if (process.env.NODE_ENV === 'production' && process.env.DEMO_ALLOW_PROD !== '1') {
        throw new Error(
            '[clean-demo] REFUSING to clean: NODE_ENV=production and DEMO_ALLOW_PROD is not "1".\n' +
                'Set DEMO_ALLOW_PROD=1 only if you really mean it (e.g. a throwaway staging project).'
        );
    }
}

function getServiceClient(): SupabaseClient {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || url.includes('your-project-url')) {
        throw new Error('[clean-demo] NEXT_PUBLIC_SUPABASE_URL is missing or unset.');
    }
    if (!serviceKey || serviceKey.includes('your-service-role-key')) {
        throw new Error('[clean-demo] SUPABASE_SERVICE_ROLE_KEY is missing or unset (server-side only).');
    }
    return createClient(url, serviceKey);
}

function fail(step: string, err: unknown): never {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`[clean-demo] FAILED at "${step}": ${message}`);
}

/** Collect every auth user id whose email belongs to the demo domain. */
async function listDemoAuthUserIds(supabase: SupabaseClient): Promise<string[]> {
    const ids: string[] = [];
    let page = 1;
    for (;;) {
        const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
        if (error) fail('list auth users', error);
        const users = data?.users ?? [];
        for (const u of users) {
            if (u.email && u.email.endsWith(`@${DEMO_EMAIL_DOMAIN}`)) ids.push(u.id);
        }
        if (users.length < 1000) break;
        page += 1;
    }
    return ids;
}

async function main(): Promise<void> {
    assertDemoAllowed();
    const supabase = getServiceClient();

    console.log('🧹 Cleaning SocialClubs demo data…');

    // 1. Demo clubs (everything underneath cascades).
    const { data: demoClubs, error: clubsError } = await supabase
        .from('clubs')
        .select('id, name')
        .eq('is_demo', true);
    if (clubsError) fail('list demo clubs', clubsError);
    const clubIds = (demoClubs ?? []).map((c) => c.id as string);
    if (clubIds.length > 0) {
        const { error } = await supabase.from('clubs').delete().in('id', clubIds);
        if (error) fail('delete demo clubs', error);
        console.log(`  · deleted ${clubIds.length} demo club(s): ${(demoClubs ?? []).map((c) => c.name).join(', ')}`);
    } else {
        console.log('  · no demo clubs found (is_demo=true)');
    }

    // 2 + 3. Demo auth users + their public profiles.
    const demoUserIds = await listDemoAuthUserIds(supabase);
    if (demoUserIds.length > 0) {
        const { error: profileError } = await supabase.from('users').delete().in('id', demoUserIds);
        if (profileError) fail('delete demo public.users', profileError);
        let deleted = 0;
        for (const id of demoUserIds) {
            const { error } = await supabase.auth.admin.deleteUser(id);
            if (error) {
                console.warn(`  ! could not delete auth user ${id}: ${error.message}`);
            } else {
                deleted += 1;
            }
        }
        console.log(`  · deleted ${deleted}/${demoUserIds.length} demo auth user(s) (@${DEMO_EMAIL_DOMAIN})`);
    } else {
        console.log(`  · no demo auth users found (@${DEMO_EMAIL_DOMAIN})`);
    }

    // 4. Verify nothing demo-marked remains.
    const { data: leftover, error: leftoverError } = await supabase
        .from('clubs')
        .select('id')
        .eq('is_demo', true)
        .limit(1);
    if (leftoverError) fail('verify cleanup', leftoverError);
    const leftoverUsers = await listDemoAuthUserIds(supabase);
    if ((leftover ?? []).length > 0 || leftoverUsers.length > 0) {
        fail('verify cleanup', new Error('demo data still present after cleanup — investigate manually'));
    }

    console.log('\n✅ Demo data fully removed. No production data was touched.');
}

main().catch((err: unknown) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
});
