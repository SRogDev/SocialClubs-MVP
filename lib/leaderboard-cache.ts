/**
 * Leaderboard Cache — Redis cache-aside pattern
 *
 * The leaderboard query (ORDER BY points DESC) is expensive at scale.
 * Cache it for 60s. The QStash worker invalidates it after each awardPoints() call.
 *
 * During the 60s window the leaderboard may be stale — acceptable for a social app.
 */
import { redis, TTL, CacheKey } from '@/lib/redis'
import { createClient } from '@/lib/supabase/server'
import type { LeaderboardEntry } from '@/types/gamification'

async function fetchLeaderboardFromDB(
    clubId: string,
    limit: number
): Promise<LeaderboardEntry[]> {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('users_clubs')
        .select(
            `
            user_id,
            points,
            users:user_id (
                username,
                avatar_url
            )
        `
        )
        .eq('club_id', clubId)
        .not('points', 'is', null)
        .order('points', { ascending: false })
        .limit(limit)

    if (error) {
        console.error('[LeaderboardCache] DB fetch error:', error)
        return []
    }

    return (
        data?.map((entry, index) => ({
            userId: entry.user_id,
            username: (entry.users as any)?.username ?? 'Unknown',
            avatarUrl: (entry.users as any)?.avatar_url ?? null,
            points: entry.points ?? 0,
            rank: index + 1,
        })) ?? []
    )
}

export async function getLeaderboardWithCache(
    clubId: string,
    limit = 10
): Promise<LeaderboardEntry[]> {
    const key = CacheKey.leaderboard(clubId)

    const cached = await redis.get<LeaderboardEntry[]>(key)
    if (cached !== null) return cached

    const entries = await fetchLeaderboardFromDB(clubId, limit)

    redis
        .setex(key, TTL.LEADERBOARD, entries)
        .catch((err) => console.error('[LeaderboardCache] setex error:', err))

    return entries
}

export async function invalidateLeaderboardCache(clubId: string): Promise<void> {
    const key = CacheKey.leaderboard(clubId)
    await redis.del(key).catch((err) =>
        console.error('[LeaderboardCache] invalidation error:', err)
    )
}
