/**
 * GET /api/posts/[postId]/stats
 *
 * Returns post statistics served from Redis cache (TTL 30s).
 * Cache is invalidated by server actions on every like/superlike/comment.
 * Called by the usePostStats SWR hook.
 */
import { NextRequest, NextResponse } from 'next/server'
import { getPostStatsWithCache } from '@/lib/post-stats-cache'

export const runtime = 'nodejs'

export async function GET(
    _request: NextRequest,
    { params }: { params: Promise<{ postId: string }> }
) {
    const { postId } = await params

    if (!postId) {
        return NextResponse.json({ error: 'Missing postId' }, { status: 400 })
    }

    try {
        const stats = await getPostStatsWithCache(postId)

        if (!stats) {
            return NextResponse.json({ error: 'Stats not found' }, { status: 404 })
        }

        return NextResponse.json(
            { data: stats },
            {
                headers: {
                    // CDN/browser cache for 25s, allow stale for up to 30s
                    'Cache-Control': 'public, s-maxage=25, stale-while-revalidate=30',
                },
            }
        )
    } catch (err) {
        console.error('[GET /api/posts/[postId]/stats]', err)
        return NextResponse.json({ error: 'Internal error' }, { status: 500 })
    }
}
