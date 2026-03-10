/**
 * Post Stats Cache — Redis cache-aside pattern
 *
 * READ path:  Redis hit → return cached value
 *             Redis miss → query Supabase → populate Redis → return fresh value
 *
 * WRITE path: Server action writes to Supabase first (authoritative),
 *             then calls invalidatePostStatsCache() to DEL the Redis key.
 *             Next read repopulates the cache with fresh data.
 *
 * TTL: 30 seconds. Worst-case stale read is 30s if invalidation is missed,
 * but under normal flow invalidation runs within the same server action.
 */
import { redis, TTL, CacheKey } from '@/lib/redis'
import { createClient } from '@/lib/supabase/server'
import type { PostStats } from '@/types/post'

async function fetchPostStatsFromDB(postId: string): Promise<PostStats | null> {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('post_stats')
        .select('*')
        .eq('post_id', postId)
        .single()

    if (error) {
        console.error('[PostStatsCache] DB fetch error:', error)
        return null
    }
    return data as PostStats
}

export async function getPostStatsWithCache(
    postId: string
): Promise<PostStats | null> {
    const key = CacheKey.postStats(postId)

    // 1. Try Redis first
    const cached = await redis.get<PostStats>(key)
    if (cached !== null) return cached

    // 2. Cache miss — fetch from Supabase
    const stats = await fetchPostStatsFromDB(postId)
    if (!stats) return null

    // 3. Populate cache (non-blocking)
    redis
        .setex(key, TTL.POST_STATS, stats)
        .catch((err) => console.error('[PostStatsCache] setex error:', err))

    return stats
}

export async function invalidatePostStatsCache(postId: string): Promise<void> {
    const key = CacheKey.postStats(postId)
    await redis.del(key).catch((err) =>
        console.error('[PostStatsCache] invalidation error:', err)
    )
}
