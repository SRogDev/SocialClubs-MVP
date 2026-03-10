/**
 * Upstash Redis Client - Singleton
 *
 * Used for:
 *   - Rate limiting (sliding window per user per post)
 *   - Post stats cache (TTL 30s) — reduces Supabase read load
 *   - Leaderboard cache (TTL 60s) — avoids expensive ORDER BY queries
 *
 * Cache key conventions:
 *   post:stats:{postId}        → PostStats object
 *   leaderboard:{clubId}       → LeaderboardEntry[]
 */
import { Redis } from '@upstash/redis'

if (!process.env.UPSTASH_REDIS_REST_URL) {
    throw new Error('UPSTASH_REDIS_REST_URL is not set')
}
if (!process.env.UPSTASH_REDIS_REST_TOKEN) {
    throw new Error('UPSTASH_REDIS_REST_TOKEN is not set')
}

export const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
})

// TTL constants (seconds)
export const TTL = {
    POST_STATS: 30,
    LEADERBOARD: 60,
} as const

// Centralized key builders — prevents typos across the codebase
export const CacheKey = {
    postStats: (postId: string) => `post:stats:${postId}`,
    leaderboard: (clubId: string) => `leaderboard:${clubId}`,
} as const
