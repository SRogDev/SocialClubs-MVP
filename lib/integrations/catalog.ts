/**
 * Starter surfacing catalog (Workstream C; Roger's rule, 2026-10-23).
 *
 * The ARCHITECTURE accepts any app the provider supports — this list
 * only controls what the product SURFACES first. Clubs belong to
 * influencers, not businesses: the launch-visible set is social +
 * entertainment. Business/productivity apps (Sheets, Notion, Drive,
 * work Slack…) are intentionally NOT surfaced at launch; nothing in
 * the provider layer prevents enabling them later.
 *
 * Slugs verified against Composio's published toolkit pages/docs on
 * 2026-10-23 for youtube, tiktok, instagram, twitter, discord.
 * spotify and twitch are included from Composio's public catalog and
 * are filtered at runtime against what the provider actually returns,
 * so an absent toolkit simply doesn't render.
 */
export interface StarterToolkit {
    slug: string;
    name: string;
    /** Spanish one-liner shown to creators. */
    blurb: string;
    category: 'video' | 'social' | 'music' | 'streaming' | 'community';
}

export const STARTER_TOOLKITS: StarterToolkit[] = [
    { slug: 'youtube', name: 'YouTube', blurb: 'Estadísticas del canal, videos y listas.', category: 'video' },
    { slug: 'tiktok', name: 'TikTok', blurb: 'Tus videos, estadísticas y publicaciones.', category: 'video' },
    { slug: 'instagram', name: 'Instagram', blurb: 'Publicaciones, historias y audiencia.', category: 'social' },
    { slug: 'twitter', name: 'X (Twitter)', blurb: 'Publicaciones y conversación en X.', category: 'social' },
    { slug: 'twitch', name: 'Twitch', blurb: 'Tu canal, directos y comunidad.', category: 'streaming' },
    { slug: 'spotify', name: 'Spotify', blurb: 'Listas de reproducción y tu música.', category: 'music' },
    { slug: 'discord', name: 'Discord', blurb: 'Tu servidor y tus canales.', category: 'community' },
];

const STARTER_SLUGS = new Set(STARTER_TOOLKITS.map((t) => t.slug));

export function isStarterToolkit(slug: string): boolean {
    return STARTER_SLUGS.has(slug.toLowerCase());
}

export function starterToolkit(slug: string): StarterToolkit | undefined {
    return STARTER_TOOLKITS.find((t) => t.slug === slug.toLowerCase());
}
