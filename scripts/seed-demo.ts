#!/usr/bin/env ts-node
/**
 * Demo seed for SocialClubs — `npm run seed:demo`
 *
 * Creates a clearly-marked demo dataset for recruiter/investor walkthroughs
 * (see docs/DEMO.md):
 *
 *   - 1 demo club "Club Demo" (clubs.is_demo = TRUE, Spanish content)
 *   - 4 demo users (creator + 3 members) with emails @demo.socialclubs
 *   - 5 posts: 3 text posts, 1 poll post, 1 widget post (giveaway)
 *   - 1 upcoming published event (+ RSVPs)
 *   - club_ai_config with 3 FAQ entries (policies.faq)
 *   - 2 pending AI drafts in ai_actions (status = pending_approval)
 *   - sample member_signals rows
 *   - 1 moderation event (flagged_for_review)
 *
 * MARKING: the club carries is_demo = TRUE (migration
 * supabase/migrations/20261015000011_demo_seed_marker.sql). Demo users are
 * identified by the @demo.socialclubs email domain. `npm run clean:demo`
 * removes ALL of it — demo data never mixes with production.
 *
 * SAFETY: refuses to run when NODE_ENV=production unless DEMO_ALLOW_PROD=1.
 * Idempotent-ish: exits early if a demo club already exists.
 *
 * Env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *      (optional) DEMO_USER_PASSWORD — password for the 4 demo accounts.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// ─── Constants ──────────────────────────────────────────────────────────────

const DEMO_EMAIL_DOMAIN = 'demo.socialclubs';
const DEMO_DEFAULT_PASSWORD = 'SocialClubs-Demo-2026!'; // throwaway demo accounts only
const DEMO_CLUB_LINK = 'club-demo';
const GIVEAWAY_WIDGET_NAME = 'giveaway';

interface DemoUserDef {
    email: string;
    name: string;
    username: string;
    bio: string;
}

const DEMO_USERS: DemoUserDef[] = [
    {
        email: `creador@${DEMO_EMAIL_DOMAIN}`,
        name: 'Demo Creador',
        username: 'demo_creador',
        bio: 'Creador de Club Demo — cuenta de demostración.',
    },
    {
        email: `maria@${DEMO_EMAIL_DOMAIN}`,
        name: 'María Demo',
        username: 'demo_maria',
        bio: 'Miembro de demostración — amante de las comunidades.',
    },
    {
        email: `carlos@${DEMO_EMAIL_DOMAIN}`,
        name: 'Carlos Demo',
        username: 'demo_carlos',
        bio: 'Miembro de demostración — siempre participando en encuestas.',
    },
    {
        email: `sofia@${DEMO_EMAIL_DOMAIN}`,
        name: 'Sofía Demo',
        username: 'demo_sofia',
        bio: 'Miembro de demostración — recién llegada al club.',
    },
];

// ─── Guards & helpers ───────────────────────────────────────────────────────

function assertDemoAllowed(): void {
    if (process.env.NODE_ENV === 'production' && process.env.DEMO_ALLOW_PROD !== '1') {
        throw new Error(
            '[seed-demo] REFUSING to seed: NODE_ENV=production and DEMO_ALLOW_PROD is not "1".\n' +
                'Demo data must never be seeded in production. Set DEMO_ALLOW_PROD=1 only if you\n' +
                'really mean it (e.g. a throwaway staging project).'
        );
    }
}

function getServiceClient(): SupabaseClient {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || url.includes('your-project-url')) {
        throw new Error('[seed-demo] NEXT_PUBLIC_SUPABASE_URL is missing or unset.');
    }
    if (!serviceKey || serviceKey.includes('your-service-role-key')) {
        throw new Error('[seed-demo] SUPABASE_SERVICE_ROLE_KEY is missing or unset (server-side only).');
    }
    return createClient(url, serviceKey);
}

function fail(step: string, err: unknown): never {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`[seed-demo] FAILED at "${step}": ${message}`);
}

async function findOrCreateDemoUser(
    supabase: SupabaseClient,
    def: DemoUserDef,
    password: string
): Promise<string> {
    // Reuse an existing auth user with the same demo email when present.
    const { data: listed, error: listError } = await supabase.auth.admin.listUsers({ perPage: 1000 });
    if (listError) fail('list auth users', listError);
    const existing = (listed?.users ?? []).find((u) => u.email === def.email);
    if (existing) {
        console.log(`  · auth user ${def.email} already exists — reusing`);
        return existing.id;
    }

    const { data, error } = await supabase.auth.admin.createUser({
        email: def.email,
        password,
        email_confirm: true,
        user_metadata: { name: def.name, is_demo: true },
    });
    if (error || !data.user) fail(`create auth user ${def.email}`, error);
    console.log(`  · created auth user ${def.email}`);
    return data.user.id;
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
    assertDemoAllowed();
    const supabase = getServiceClient();
    const password = process.env.DEMO_USER_PASSWORD ?? DEMO_DEFAULT_PASSWORD;

    console.log('🌱 Seeding SocialClubs demo data…');

    // 0. Bail out early if demo data already exists (idempotent-ish).
    const { data: existingClubs, error: existingError } = await supabase
        .from('clubs')
        .select('id')
        .eq('is_demo', true)
        .limit(1);
    if (existingError) fail('check existing demo clubs', existingError);
    if (existingClubs && existingClubs.length > 0) {
        console.log(
            '✓ Demo data already seeded (a club with is_demo=true exists).\n' +
                '  Run `npm run clean:demo` first to reseed from scratch.'
        );
        return;
    }

    // 1. Demo users (auth + public profile).
    console.log('→ creating demo users…');
    const userIds: Record<string, string> = {};
    for (const def of DEMO_USERS) {
        const id = await findOrCreateDemoUser(supabase, def, password);
        userIds[def.username] = id;
        const { error: profileError } = await supabase.from('users').upsert(
            {
                id,
                name: def.name,
                username: def.username,
                bio: def.bio,
                avatar_url: null,
                is_member: true,
            },
            { onConflict: 'id' }
        );
        if (profileError) fail(`upsert public.users ${def.username}`, profileError);
    }
    const creatorId = userIds['demo_creador'];
    const mariaId = userIds['demo_maria'];
    const carlosId = userIds['demo_carlos'];
    const sofiaId = userIds['demo_sofia'];

    // 2. Demo club (clearly marked).
    console.log('→ creating "Club Demo"…');
    const { data: club, error: clubError } = await supabase
        .from('clubs')
        .insert({
            name: 'Club Demo',
            bio: 'Club de demostración de SocialClubs. Contenido de ejemplo en español para recorridos de demostración — no son datos reales.',
            color: '#7C3AED',
            level: 1,
            privacity: 'public',
            creator: creatorId,
            tags: ['demo', 'comunidad', 'español'],
            total_members: 4,
            club_link: DEMO_CLUB_LINK,
            is_demo: true,
        })
        .select('id')
        .single();
    if (clubError || !club) fail('create demo club', clubError);
    const clubId: string = club.id;

    // 3. Memberships.
    console.log('→ adding memberships…');
    const memberships = [
        { user_id: creatorId, role: 'owner' },
        { user_id: mariaId, role: 'member' },
        { user_id: carlosId, role: 'member' },
        { user_id: sofiaId, role: 'member' },
    ];
    for (const m of memberships) {
        const { error } = await supabase.from('users_clubs').insert({
            user_id: m.user_id,
            club_id: clubId,
            role: m.role,
            points: 0,
        });
        if (error) fail(`add membership ${m.user_id}`, error);
    }

    // 4. Posts (5): 3 text + 1 poll + 1 widget.
    console.log('→ creating posts…');
    const postRows: Array<{ content: Record<string, string>; type: string }> = [
        {
            type: 'text',
            content: {
                text: '¡Bienvenidos a Club Demo! 🎉 Este es un club de demostración con contenido de ejemplo en español. Explora las publicaciones, vota en la encuesta y prueba el asistente de IA.',
            },
        },
        {
            type: 'text',
            content: {
                text: 'Esta semana hablamos de cómo hacer crecer una comunidad desde cero. ¿Cuál ha sido su mayor aprendizaje hasta ahora? Los leo en los comentarios. 💬',
            },
        },
        {
            type: 'text',
            content: {
                text: 'Recordatorio: el encuentro en vivo de preguntas y respuestas es esta semana. ¡Confirmen su asistencia en la sección de eventos! 📅',
            },
        },
    ];
    const postIds: string[] = [];
    for (const row of postRows) {
        const { data, error } = await supabase
            .from('posts')
            .insert({ club_id: clubId, content: row.content, type: row.type })
            .select('id')
            .single();
        if (error || !data) fail('create text post', error);
        postIds.push(data.id);
    }

    // 4a. Poll post.
    const { data: pollPost, error: pollPostError } = await supabase
        .from('posts')
        .insert({
            club_id: clubId,
            content: { text: '¡Tu opinión cuenta! Vota y ayúdanos a elegir el tema del próximo encuentro.' },
            type: 'poll',
        })
        .select('id')
        .single();
    if (pollPostError || !pollPost) fail('create poll post', pollPostError);
    postIds.push(pollPost.id);
    const closesAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const { error: pollError } = await supabase.from('polls').insert({
        post_id: pollPost.id,
        question: '¿Qué tema prefieren para el próximo encuentro en vivo?',
        options: [
            { text: 'Crecimiento en redes sociales' },
            { text: 'Monetización de la comunidad' },
            { text: 'Organización de eventos' },
            { text: 'Herramientas de IA para creadores' },
        ],
        is_anonymous: false,
        is_multiple_choice: false,
        allows_add_options: false,
        closes_at: closesAt,
        total_votes: 0,
    });
    if (pollError) fail('create poll', pollError);

    // 4b. Widget post (giveaway instance).
    const { data: widget, error: widgetError } = await supabase
        .from('widgets')
        .select('id')
        .eq('name', GIVEAWAY_WIDGET_NAME)
        .maybeSingle();
    if (widgetError) fail('lookup giveaway widget', widgetError);
    if (!widget) {
        fail(
            'lookup giveaway widget',
            new Error(
                `base widget "${GIVEAWAY_WIDGET_NAME}" not found — run migration 20260302000003_seed_base_widgets.sql first`
            )
        );
    }
    const { data: clubWidget, error: clubWidgetError } = await supabase
        .from('club_widgets')
        .insert({ club_id: clubId, widget_id: widget.id, cache_data: { participant_count: 0 } })
        .select('id')
        .single();
    if (clubWidgetError || !clubWidget) fail('create club widget instance', clubWidgetError);
    const giveawayData: Array<[string, Record<string, unknown>]> = [
        ['title', { value: 'Sorteo de bienvenida 🎁' }],
        ['prize', { value: 'Un mes gratis de membresía premium' }],
        ['resolve_at', { value: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString() }],
        ['participants', { value: [] }],
    ];
    for (const [key, value] of giveawayData) {
        const { error } = await supabase
            .from('club_widgets_data')
            .insert({ club_widget_id: clubWidget.id, key, value });
        if (error) fail(`seed widget data ${key}`, error);
    }
    const { data: widgetPost, error: widgetPostError } = await supabase
        .from('posts')
        .insert({
            club_id: clubId,
            content: { club_widget_id: clubWidget.id, widget_slug: GIVEAWAY_WIDGET_NAME },
            type: 'widget',
        })
        .select('id')
        .single();
    if (widgetPostError || !widgetPost) fail('create widget post', widgetPostError);
    postIds.push(widgetPost.id);

    // 4c. Post stats (so analytics/feedback screens have numbers).
    const statsSeed = [
        { likes: 12, superlikes: 2, comments: 4, user_views: 48 },
        { likes: 8, superlikes: 1, comments: 6, user_views: 35 },
        { likes: 5, superlikes: 0, comments: 2, user_views: 29 },
        { likes: 15, superlikes: 3, comments: 1, user_views: 52 },
        { likes: 20, superlikes: 4, comments: 0, user_views: 61 },
    ];
    for (let i = 0; i < postIds.length; i++) {
        const s = statsSeed[i];
        const { error } = await supabase.from('post_stats').insert({
            post_id: postIds[i],
            likes: s.likes,
            superlikes: s.superlikes,
            comments: s.comments,
            user_views: s.user_views,
        });
        if (error) fail('seed post_stats', error);
    }

    // 5. Upcoming event (+ RSVPs).
    console.log('→ creating event…');
    const startsAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
    startsAt.setHours(18, 0, 0, 0);
    const endsAt = new Date(startsAt.getTime() + 2 * 60 * 60 * 1000);
    const { data: event, error: eventError } = await supabase
        .from('events')
        .insert({
            club_id: clubId,
            title: 'Encuentro en vivo: Preguntas y respuestas',
            description:
                'Sesión en vivo de demostración: respondemos preguntas sobre cómo usar SocialClubs y hacemos networking entre miembros. ¡Trae tus preguntas!',
            starts_at: startsAt.toISOString(),
            ends_at: endsAt.toISOString(),
            timezone: 'America/Havana',
            capacity: 50,
            status: 'published',
            created_by: creatorId,
        })
        .select('id')
        .single();
    if (eventError || !event) fail('create event', eventError);
    for (const uid of [creatorId, mariaId, carlosId]) {
        const { error } = await supabase
            .from('event_rsvps')
            .insert({ event_id: event.id, user_id: uid, status: 'going' });
        if (error) fail('seed event RSVP', error);
    }

    // 6. AI config with FAQ (Spanish).
    console.log('→ configuring club AI (FAQ)…');
    const { error: faqError } = await supabase.from('club_ai_config').upsert(
        {
            club_id: clubId,
            proactivity_level: 1,
            enabled_agents: ['community-manager'],
            tone: 'friendly',
            policies: {
                faq: [
                    {
                        q: '¿Qué es Club Demo?',
                        a: 'Club Demo es un club de demostración de SocialClubs con contenido de ejemplo en español. Sirve para recorrer el producto: publicaciones, encuestas, widgets, eventos y el asistente de IA.',
                    },
                    {
                        q: '¿Cómo me uno a un evento?',
                        a: 'Abre la sección de eventos del club, elige el evento y confirma tu asistencia con el botón de RSVP. Recibirás un recordatorio antes de que empiece.',
                    },
                    {
                        q: '¿Los datos de esta demo son reales?',
                        a: 'No. Todo el contenido de Club Demo está marcado como datos de demostración (is_demo=true) y puede eliminarse por completo con `npm run clean:demo`. Nunca se mezcla con datos de producción.',
                    },
                ],
            },
        },
        { onConflict: 'club_id' }
    );
    if (faqError) fail('seed club_ai_config FAQ', faqError);

    // 7. Two pending AI drafts for the AI Inbox demo.
    console.log('→ creating pending AI drafts…');
    const drafts = [
        {
            agent_id: 'community-manager',
            action: 'send_welcome',
            inputs: {
                user_id: sofiaId,
                channel: 'general',
                message:
                    '¡Hola Sofía! 👋 Bienvenida a Club Demo. Soy el asistente de la comunidad: si tienes preguntas, escríbeme cuando quieras.',
            },
            idempotency_key: 'demo-welcome-sofia',
            status: 'pending_approval',
            policy_result: { allowed: true, reason: 'demo draft' },
            review_result: { approved: false, reason: 'awaiting human approval in AI Inbox' },
        },
        {
            agent_id: 'community-manager',
            action: 'post_digest',
            inputs: {
                period: 'weekly',
                highlights: [
                    'La encuesta sobre el próximo encuentro ya tiene votos',
                    'Nuevo sorteo de bienvenida activo',
                    '3 miembros confirmaron asistencia al evento en vivo',
                ],
            },
            idempotency_key: 'demo-weekly-digest',
            status: 'pending_approval',
            policy_result: { allowed: true, reason: 'demo draft' },
            review_result: { approved: false, reason: 'awaiting human approval in AI Inbox' },
        },
    ];
    for (const d of drafts) {
        const { error } = await supabase.from('ai_actions').insert({ club_id: clubId, ...d });
        if (error) fail(`seed ai_action draft ${d.idempotency_key}`, error);
    }

    // 8. Sample member signals.
    console.log('→ seeding member signals…');
    const signals = [
        { user_id: mariaId, signal_type: 'posted', payload: { postId: postIds[1], tags: ['comunidad'] } },
        { user_id: carlosId, signal_type: 'engaged', payload: { postId: pollPost.id, kind: 'vote' } },
        { user_id: sofiaId, signal_type: 'engaged', payload: { postId: postIds[0], kind: 'like' } },
        {
            user_id: carlosId,
            signal_type: 'interest',
            payload: { tags: ['encuestas', 'eventos'], source: 'declared' },
        },
        { user_id: mariaId, signal_type: 'milestone', payload: { milestone: 'first_week_active' } },
        { user_id: sofiaId, signal_type: 'preference', payload: { topic: 'onboarding', value: 'prefiere mensajes cortos' } },
    ];
    for (const s of signals) {
        const { error } = await supabase
            .from('member_signals')
            .insert({ club_id: clubId, user_id: s.user_id, signal_type: s.signal_type, payload: s.payload });
        if (error) fail('seed member_signals', error);
    }

    // 9. One moderation event (flagged for review → shows up in the Inbox queue).
    console.log('→ creating moderation event…');
    const { error: modError } = await supabase.from('moderation_events').insert({
        club_id: clubId,
        target_type: 'post',
        target_id: postIds[1],
        verdict: 'suspicious',
        layer: 'deterministic',
        reasons: [
            {
                code: 'demo_flag',
                message: 'Demo: contenido marcado automáticamente para revisión humana.',
            },
        ],
        action_taken: 'flagged_for_review',
    });
    if (modError) fail('seed moderation_events', modError);

    // ── Summary ──────────────────────────────────────────────────────────
    console.log('\n✅ Demo seed complete:\n');
    console.log(`   Club:      "Club Demo" (${clubId}) — is_demo=true`);
    console.log('   Users:     creador@demo.socialclubs (owner)');
    console.log('              maria@demo.socialclubs, carlos@demo.socialclubs, sofia@demo.socialclubs (members)');
    console.log(`   Password:  ${process.env.DEMO_USER_PASSWORD ? '(from DEMO_USER_PASSWORD)' : `"${DEMO_DEFAULT_PASSWORD}" (default)`}`);
    console.log('   Posts:     5 (3 text, 1 poll, 1 widget/giveaway)');
    console.log('   Event:     1 upcoming (published, 3 RSVPs)');
    console.log('   FAQ:       3 entries in club_ai_config.policies.faq');
    console.log('   AI drafts: 2 pending_approval rows in ai_actions');
    console.log('   Signals:   6 member_signals · Moderation: 1 flagged_for_review event');
    console.log('\n🧹 Remove everything with: npm run clean:demo');
    console.log('📖 Demo walkthrough: docs/DEMO.md');
}

main().catch((err: unknown) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
});
