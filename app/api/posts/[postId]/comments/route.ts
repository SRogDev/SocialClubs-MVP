/**
 * GET /api/posts/[postId]/comments
 *
 * Returns comments for a post, joined with author user data.
 * Called by the usePostComments SWR hook inside CommentsModal.
 */
import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server'

import { createClient } from '@/lib/supabase/server'


export async function GET(
    _request: NextRequest,
    { params }: { params: Promise<{ postId: string }> }
) {
    const { postId } = await params

    if (!postId) {
        return NextResponse.json({ error: 'Missing postId' }, { status: 400 })
    }

    try {
        const supabase = await createClient()

        const { data, error } = await supabase
            .from('post_comments')
            .select(`
                id,
                post_id,
                user_id,
                content,
                parent_comment_id,
                created_at,
                users:user_id (
                    name,
                    username,
                    avatar_url
                )
            `)
            .eq('post_id', postId)
            .order('created_at', { ascending: true })

        if (error) {
            console.error('[GET /api/posts/[postId]/comments]', error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({ data: data || [] })
    } catch (err) {
        console.error('[GET /api/posts/[postId]/comments]', err)
        return NextResponse.json({ error: 'Internal error' }, { status: 500 })
    }
}
