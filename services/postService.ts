/**
 * Post Service - CRUD operations for posts
 */

import { cache } from 'react'

import { createClient } from '@/lib/supabase/server'
import { createPostSchema, updatePostSchema, commentSchema, postInteractionSchema, type CreatePostInput, type UpdatePostInput, type CommentInput, type PostInteractionInput } from '@/schemas/postSchema'
import type { Post, PostStats, PostComment, PostInteraction, Poll } from '@/types/post'

/**
 * Get all posts (optionally filtered by club)
 */
export const getPosts = cache(async (clubId?: string): Promise<Post[]> => {
    const supabase = await createClient()

    let query = supabase
        .from('posts')
        .select('*')
        .order('created_at', { ascending: false })

    if (clubId) {
        query = query.eq('club_id', clubId)
    }

    const { data, error } = await query

    if (error) {
        console.error('Error fetching posts:', error)
        throw new Error('Failed to fetch posts')
    }

    return data || []
})

/**
 * Get a single post by ID
 */
export const getPostById = cache(async (id: string): Promise<Post | null> => {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('posts')
        .select('*')
        .eq('id', id)
        .single()

    if (error) {
        console.error('Error fetching post:', error)
        return null
    }

    return data
})

/**
 * Get post statistics
 */
export const getPostStats = cache(async (postId: string): Promise<PostStats | null> => {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('post_stats')
        .select('*')
        .eq('post_id', postId)
        .single()

    if (error) {
        console.error('Error fetching post stats:', error)
        return null
    }

    return data
})

/**
 * Get poll for a post
 */
export const getPollByPostId = cache(async (postId: string): Promise<Poll | null> => {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('polls')
        .select('*')
        .eq('post_id', postId)
        .single()

    if (error) {
        console.error('Error fetching poll:', error)
        return null
    }

    return data
})

/**
 * Create a new post
 */
export async function createPost(input: CreatePostInput, userId: string): Promise<Post> {
    // Validate input
    const validated = createPostSchema.parse(input)

    const supabase = await createClient()

    // Create the post
    const { data: post, error: postError } = await supabase
        .from('posts')
        .insert({
            club_id: validated.club_id,
            content: validated.content,
            type: validated.type,
        })
        .select()
        .single()

    if (postError) {
        console.error('Error creating post:', postError)
        throw new Error('Failed to create post')
    }

    // If it's a poll, create the poll as well
    if (validated.type === 'poll' && 'poll' in validated) {
        const { error: pollError } = await supabase
            .from('polls')
            .insert({
                post_id: post.id,
                question: validated.poll.question,
                options: validated.poll.options,
                is_anonymous: validated.poll.is_anonymous,
                is_multiple_choice: validated.poll.is_multiple_choice,
                allows_add_options: validated.poll.allows_add_options,
                closes_at: validated.poll.closes_at,
            })

        if (pollError) {
            console.error('Error creating poll:', pollError)
            // Rollback post creation
            await supabase.from('posts').delete().eq('id', post.id)
            throw new Error('Failed to create poll')
        }
    }

    // Initialize post stats
    await supabase
        .from('post_stats')
        .insert({
            post_id: post.id,
            likes: 0,
            superlikes: 0,
            comments: 0,
            user_views: 0,
        })

    return post
}

/**
 * Update a post
 */
export async function updatePost(id: string, input: UpdatePostInput): Promise<Post> {
    // Validate input
    const validated = updatePostSchema.parse(input)

    const supabase = await createClient()

    const { data, error } = await supabase
        .from('posts')
        .update(validated)
        .eq('id', id)
        .select()
        .single()

    if (error) {
        console.error('Error updating post:', error)
        throw new Error('Failed to update post')
    }

    return data
}

/**
 * Delete a post
 */
export async function deletePost(id: string): Promise<void> {
    const supabase = await createClient()

    // Get post to check if it has video
    const { data: post } = await supabase
        .from('posts')
        .select('type, content')
        .eq('id', id)
        .single()

    // If video post, delete Mux asset
    if (post?.type === 'video' && post.content?.video?.mux_asset_id) {
        const { deleteMuxAsset } = await import('@/services/videoService')
        await deleteMuxAsset(post.content.video.mux_asset_id)
    }

    // Delete post from database
    const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', id)

    if (error) {
        console.error('Error deleting post:', error)
        throw new Error('Failed to delete post')
    }
}

/**
 * Add a comment to a post
 */
export async function addComment(input: CommentInput, userId: string): Promise<PostComment> {
    // Validate input
    const validated = commentSchema.parse(input)

    const supabase = await createClient()

    const { data, error } = await supabase
        .from('post_comments')
        .insert({
            post_id: validated.post_id,
            user_id: userId,
            content: validated.content,
            parent_comment_id: validated.parent_comment_id,
        })
        .select()
        .single()

    if (error) {
        console.error('Error adding comment:', error)
        throw new Error('Failed to add comment')
    }

    // Update comment count in post_stats
    await supabase.rpc('increment_comment_count', { post_id_input: validated.post_id })

    return data
}

/**
 * Get comments for a post
 */
export const getPostComments = cache(async (postId: string): Promise<PostComment[]> => {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('post_comments')
        .select('*')
        .eq('post_id', postId)
        .order('created_at', { ascending: true })

    if (error) {
        console.error('Error fetching comments:', error)
        throw new Error('Failed to fetch comments')
    }

    return data || []
})

/**
 * Add post interaction (like or superlike)
 */
export async function addPostInteraction(input: PostInteractionInput, userId: string): Promise<PostInteraction> {
    // Validate input
    const validated = postInteractionSchema.parse(input)

    const supabase = await createClient()

    // Check if interaction already exists
    const { data: existing } = await supabase
        .from('post_interactions')
        .select('*')
        .eq('post_id', validated.post_id)
        .eq('user_id', userId)
        .eq('interaction_type', validated.interaction_type)
        .single()

    if (existing) {
        throw new Error('Interaction already exists')
    }

    const { data, error } = await supabase
        .from('post_interactions')
        .insert({
            post_id: validated.post_id,
            user_id: userId,
            interaction_type: validated.interaction_type,
        })
        .select()
        .single()

    if (error) {
        console.error('Error adding interaction:', error)
        throw new Error('Failed to add interaction')
    }

    // Update interaction count in post_stats
    if (validated.interaction_type === 'like') {
        await supabase.rpc('increment_like_count', { post_id_input: validated.post_id })
    } else if (validated.interaction_type === 'superlike') {
        await supabase.rpc('increment_superlike_count', { post_id_input: validated.post_id })
    }

    return data
}

/**
 * Remove post interaction
 */
export async function removePostInteraction(postId: string, userId: string, interactionType: 'like' | 'superlike'): Promise<void> {
    const supabase = await createClient()

    const { error } = await supabase
        .from('post_interactions')
        .delete()
        .eq('post_id', postId)
        .eq('user_id', userId)
        .eq('interaction_type', interactionType)

    if (error) {
        console.error('Error removing interaction:', error)
        throw new Error('Failed to remove interaction')
    }

    // Update interaction count in post_stats
    if (interactionType === 'like') {
        await supabase.rpc('decrement_like_count', { post_id_input: postId })
    } else if (interactionType === 'superlike') {
        await supabase.rpc('decrement_superlike_count', { post_id_input: postId })
    }
}

/**
 * Get user interactions for posts
 */
export const getUserPostInteractions = cache(async (userId: string, postIds: string[]): Promise<PostInteraction[]> => {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('post_interactions')
        .select('*')
        .eq('user_id', userId)
        .in('post_id', postIds)

    if (error) {
        console.error('Error fetching user interactions:', error)
        return []
    }

    return data || []
})

/**
 * Get posts authored by a user, newest first.
 * NOTE: the `posts` table has no `user_id` column — the author is matched
 * through the `content` jsonb payload (`content->>user_id`). Posts whose
 * content doesn't carry a user_id won't be returned.
 */
export const getUserPosts = cache(async (userId: string): Promise<Post[]> => {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('posts')
        .select('*')
        .filter('content->>user_id', 'eq', userId)
        .order('created_at', { ascending: false })

    if (error) {
        console.error('Error fetching user posts:', error)
        throw new Error('Failed to fetch user posts')
    }

    return data || []
})

/**
 * Get trending posts ordered by engagement (likes + comments from post_stats).
 * The `posts` table has no engagement columns, so stats are joined and the
 * score computed in-memory; falls back to newest-first when stats are missing.
 */
export const getTrendingPosts = cache(async (limit = 20): Promise<Post[]> => {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('posts')
        .select('*, post_stats(likes, comments)')
        .order('created_at', { ascending: false })
        .limit(limit * 3)

    if (error) {
        console.error('Error fetching trending posts:', error)
        throw new Error('Failed to fetch trending posts')
    }

    const engagementScore = (post: any): number => {
        const stats = post.post_stats?.[0] ?? post.post_stats
        return (stats?.likes ?? 0) + (stats?.comments ?? 0)
    }

    const sorted = [...(data || [])].sort(
        (a, b) => engagementScore(b) - engagementScore(a)
    )

    // Strip the joined stats to keep the Post[] shape
    return sorted.slice(0, limit).map(({ post_stats, ...post }: any) => post)
})
