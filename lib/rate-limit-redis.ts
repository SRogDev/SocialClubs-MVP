/**
 * Redis-Backed Rate Limiter for Server Actions
 *
 * Uses @upstash/ratelimit with sliding window algorithm.
 * Works correctly across all Vercel serverless instances (unlike in-memory solutions).
 *
 * Rules:
 *   Like actions:    1 per (userId + postId) per 2 seconds — prevents spam clicks
 *   Comment actions: 5 per userId per 10 seconds — prevents comment flooding
 */
import { Ratelimit } from '@upstash/ratelimit'
import { redis } from '@/lib/redis'

const likeRateLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(1, '2s'),
    prefix: 'rl:like',
    analytics: false,
})

const commentRateLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, '10s'),
    prefix: 'rl:comment',
    analytics: false,
})

export interface RateLimitResult {
    allowed: boolean
    retryAfter?: number // seconds until the next request is allowed
}

/**
 * Check if a user can like/unlike a specific post right now.
 * Keyed per user + post so the limit doesn't bleed across different posts.
 */
export async function checkLikeRateLimit(
    userId: string,
    postId: string
): Promise<RateLimitResult> {
    const { success, reset } = await likeRateLimiter.limit(`${userId}:${postId}`)
    if (!success) {
        return { allowed: false, retryAfter: Math.ceil((reset - Date.now()) / 1000) }
    }
    return { allowed: true }
}

/**
 * Check if a user can add a comment.
 * Keyed per userId only — comments are lower frequency than likes.
 */
export async function checkCommentRateLimit(
    userId: string
): Promise<RateLimitResult> {
    const { success, reset } = await commentRateLimiter.limit(userId)
    if (!success) {
        return { allowed: false, retryAfter: Math.ceil((reset - Date.now()) / 1000) }
    }
    return { allowed: true }
}
