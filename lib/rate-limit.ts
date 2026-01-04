/**
 * Rate Limiting Utility for API Routes
 * 
 * Simple in-memory rate limiter using LRU cache strategy.
 * For production, consider Redis-based solution.
 */

import { NextRequest, NextResponse } from 'next/server'

interface RateLimitData {
    count: number
    resetTime: number
}

// In-memory store (use Redis in production for multi-instance deployments)
const rateLimitStore = new Map<string, RateLimitData>()

// Cleanup old entries every 10 minutes
setInterval(() => {
    const now = Date.now()
    for (const [key, data] of rateLimitStore.entries()) {
        if (now > data.resetTime) {
            rateLimitStore.delete(key)
        }
    }
}, 10 * 60 * 1000)

export interface RateLimitConfig {
    /**
     * Maximum number of requests allowed
     */
    limit: number
    /**
     * Time window in milliseconds
     */
    windowMs: number
    /**
     * Optional: Use IP address for identification (default: true)
     * If false, uses user ID from auth
     */
    useIp?: boolean
}

/**
 * Default rate limit configurations for different types of operations
 */
export const RATE_LIMITS = {
    // Strict limits for mutations
    MUTATION: {
        limit: 10,
        windowMs: 60 * 1000, // 10 requests per minute
        useIp: true,
    },
    // More lenient for reads
    READ: {
        limit: 100,
        windowMs: 60 * 1000, // 100 requests per minute
        useIp: true,
    },
    // For query operations (admin)
    QUERY: {
        limit: 50,
        windowMs: 60 * 1000, // 50 requests per minute
        useIp: true,
    },
    // Very strict for auth operations
    AUTH: {
        limit: 5,
        windowMs: 60 * 1000, // 5 requests per minute
        useIp: true,
    },
} as const

/**
 * Get identifier for rate limiting
 */
function getIdentifier(request: NextRequest, config: RateLimitConfig): string {
    if (config.useIp !== false) {
        // Try to get real IP from headers (for proxies/load balancers)
        const forwarded = request.headers.get('x-forwarded-for')
        const realIp = request.headers.get('x-real-ip')
        const ip = forwarded?.split(',')[0] || realIp || 'unknown'
        return `ip:${ip}`
    }

    // Could extract user ID from auth token here if needed
    // For now, fallback to IP
    const forwarded = request.headers.get('x-forwarded-for')
    const ip = forwarded?.split(',')[0] || request.headers.get('x-real-ip') || 'unknown'
    return `ip:${ip}`
}

/**
 * Rate limiter middleware for API routes
 * 
 * Usage:
 * ```ts
 * export async function POST(request: NextRequest) {
 *   const rateLimitResult = await rateLimit(request, RATE_LIMITS.MUTATION)
 *   if (rateLimitResult) return rateLimitResult
 *   
 *   // Your handler logic here
 * }
 * ```
 */
export async function rateLimit(
    request: NextRequest,
    config: RateLimitConfig = RATE_LIMITS.MUTATION
): Promise<NextResponse | null> {
    const identifier = getIdentifier(request, config)
    const now = Date.now()

    // Get or create rate limit data
    let rateLimitData = rateLimitStore.get(identifier)

    // Reset if window has passed
    if (!rateLimitData || now > rateLimitData.resetTime) {
        rateLimitData = {
            count: 0,
            resetTime: now + config.windowMs,
        }
        rateLimitStore.set(identifier, rateLimitData)
    }

    // Increment counter
    rateLimitData.count++

    // Calculate remaining and reset time
    const remaining = Math.max(0, config.limit - rateLimitData.count)
    const resetTime = rateLimitData.resetTime

    // Check if limit exceeded
    if (rateLimitData.count > config.limit) {
        const retryAfter = Math.ceil((resetTime - now) / 1000)

        return NextResponse.json(
            {
                error: 'Too many requests',
                message: `Rate limit exceeded. Try again in ${retryAfter} seconds.`,
            },
            {
                status: 429,
                headers: {
                    'X-RateLimit-Limit': config.limit.toString(),
                    'X-RateLimit-Remaining': '0',
                    'X-RateLimit-Reset': new Date(resetTime).toISOString(),
                    'Retry-After': retryAfter.toString(),
                },
            }
        )
    }

    // Add rate limit headers to response (will be used by the actual handler)
    // Store these in request context for the handler to add to its response
    ; (request as any).rateLimitHeaders = {
        'X-RateLimit-Limit': config.limit.toString(),
        'X-RateLimit-Remaining': remaining.toString(),
        'X-RateLimit-Reset': new Date(resetTime).toISOString(),
    }

    // Allow request to proceed
    return null
}

/**
 * Helper to add rate limit headers to a response
 */
export function addRateLimitHeaders(
    response: NextResponse,
    request: NextRequest
): NextResponse {
    const headers = (request as any).rateLimitHeaders as Record<string, string> | undefined

    if (headers) {
        Object.entries(headers).forEach(([key, value]) => {
            response.headers.set(key, value)
        })
    }

    return response
}
