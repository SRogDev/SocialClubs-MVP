/**
 * Supabase-backed club context for the Creator Copilot (master plan Phases
 * 34-37, 39-40).
 *
 * `supabaseClubContext()` returns a `ClubContextStore` (see
 * lib/ai/creator-copilot.ts) that loads the club's name and a short list of
 * recent post topics so drafts are grounded in real club data instead of
 * hallucinated. Fail-soft: any DB error resolves to null and the copilot
 * prompt degrades to the no-context branch (stated explicitly to the model).
 */
import { createClient } from '@supabase/supabase-js';

import type { ClubContextStore } from './creator-copilot';
import { extractPostText } from './moderation';
import { AIAgentError } from './types';

const MAX_RECENT_POSTS = 8;
const MAX_TOPIC_CHARS = 100;

/** Render one post as a compact topic line (text + explicit tags). */
function topicLine(content: unknown): string | null {
    if (!content || typeof content !== 'object') return null;
    const text = extractPostText(content as Record<string, unknown>).trim();
    const tags = (content as { tags?: unknown }).tags;
    const tagList = Array.isArray(tags)
        ? tags.filter((t): t is string => typeof t === 'string' && t.length > 0)
        : [];
    const parts: string[] = [];
    if (text.length > 0) parts.push(text.slice(0, MAX_TOPIC_CHARS));
    if (tagList.length > 0) parts.push(`tags: ${tagList.join(', ')}`);
    return parts.length > 0 ? parts.join(' ') : null;
}

export function supabaseClubContext(): ClubContextStore {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !serviceKey) {
        throw new AIAgentError(
            'AI_DB_UNAVAILABLE',
            'Supabase env (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY) is not configured.',
        );
    }
    const supabase = createClient(url, serviceKey);

    return {
        async load(clubId: string) {
            const { data: club, error: clubError } = await supabase
                .from('clubs')
                .select('name')
                .eq('id', clubId)
                .maybeSingle();
            if (clubError) {
                throw new AIAgentError(
                    'AI_DB_UNAVAILABLE',
                    `Failed to read clubs: ${clubError.message}`,
                );
            }
            const { data: posts, error: postsError } = await supabase
                .from('posts')
                .select('content')
                .eq('club_id', clubId)
                .order('created_at', { ascending: false })
                .limit(MAX_RECENT_POSTS);
            if (postsError) {
                throw new AIAgentError(
                    'AI_DB_UNAVAILABLE',
                    `Failed to read posts: ${postsError.message}`,
                );
            }
            const recentTopics = (posts ?? [])
                .map((p) => topicLine((p as { content?: unknown }).content))
                .filter((t): t is string => t !== null);
            return {
                name: (club as { name?: string } | null)?.name ?? '',
                recentTopics,
            };
        },
    };
}
