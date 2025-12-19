'use server'

/**
 * Post Actions - Server Actions para mutaciones de posts
 * Patrón Repository: Actions llaman a services, services contienen CRUD
 */

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import {
    createPost,
    updatePost,
    deletePost,
    addComment,
    addPostInteraction,
    removePostInteraction,
} from '@/services/postService'
import {
    createPostSchema,
    updatePostSchema,
    commentSchema,
    type CreatePostInput,
    type UpdatePostInput,
    type CommentInput,
} from '@/schemas/postSchema'
import type { Post, PostComment } from '@/types/post'

/**
 * Create a new post
 */
export async function createPostAction(
    input: CreatePostInput
): Promise<{ success: boolean; data?: Post; error?: string }> {
    try {
        // Validate input
        const validated = createPostSchema.parse(input)

        // Get authenticated user
        const supabase = await createClient()
        const {
            data: { user },
            error: authError,
        } = await supabase.auth.getUser()

        if (authError || !user) {
            return { success: false, error: 'Usuario no autenticado' }
        }

        // Verify user is member of the club
        const { data: membership } = await supabase
            .from('users_clubs')
            .select('id')
            .eq('user_id', user.id)
            .eq('club_id', validated.club_id)
            .single()

        if (!membership) {
            return {
                success: false,
                error: 'No eres miembro de este club',
            }
        }

        // Create post
        const post = await createPost(validated, user.id)

        // Revalidate paths
        revalidatePath(`/clubs/${validated.club_id}`)

        return { success: true, data: post }
    } catch (error) {
        console.error('Error creating post:', error)
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Error al crear el post',
        }
    }
}

/**
 * Update a post
 */
export async function updatePostAction(
    postId: string,
    input: UpdatePostInput
): Promise<{ success: boolean; data?: Post; error?: string }> {
    try {
        // Validate input
        const validated = updatePostSchema.parse(input)

        // Get authenticated user
        const supabase = await createClient()
        const {
            data: { user },
            error: authError,
        } = await supabase.auth.getUser()

        if (authError || !user) {
            return { success: false, error: 'Usuario no autenticado' }
        }

        // Verify user owns the post
        const { data: post } = await supabase
            .from('posts')
            .select('user_id, club_id')
            .eq('id', postId)
            .single()

        if (!post || post.user_id !== user.id) {
            return {
                success: false,
                error: 'No tienes permisos para actualizar este post',
            }
        }

        // Update post
        const updatedPost = await updatePost(postId, validated)

        // Revalidate paths
        revalidatePath(`/clubs/${post.club_id}`)

        return { success: true, data: updatedPost }
    } catch (error) {
        console.error('Error updating post:', error)
        return {
            success: false,
            error:
                error instanceof Error ? error.message : 'Error al actualizar el post',
        }
    }
}

/**
 * Delete a post
 */
export async function deletePostAction(
    postId: string
): Promise<{ success: boolean; error?: string }> {
    try {
        // Get authenticated user
        const supabase = await createClient()
        const {
            data: { user },
            error: authError,
        } = await supabase.auth.getUser()

        if (authError || !user) {
            return { success: false, error: 'Usuario no autenticado' }
        }

        // Verify user owns the post or is club creator
        const { data: post } = await supabase
            .from('posts')
            .select('user_id, club_id, clubs(creator)')
            .eq('id', postId)
            .single()

        if (!post) {
            return { success: false, error: 'Post no encontrado' }
        }

        const isOwner = post.user_id === user.id
        const isClubCreator =
            post.clubs && (post.clubs as any).creator === user.id

        if (!isOwner && !isClubCreator) {
            return {
                success: false,
                error: 'No tienes permisos para eliminar este post',
            }
        }

        // Delete post
        await deletePost(postId)

        // Revalidate paths
        revalidatePath(`/clubs/${post.club_id}`)

        return { success: true }
    } catch (error) {
        console.error('Error deleting post:', error)
        return {
            success: false,
            error:
                error instanceof Error ? error.message : 'Error al eliminar el post',
        }
    }
}

/**
 * Add a comment to a post
 */
export async function addCommentAction(
    input: CommentInput
): Promise<{ success: boolean; data?: PostComment; error?: string }> {
    try {
        // Validate input
        const validated = commentSchema.parse(input)

        // Get authenticated user
        const supabase = await createClient()
        const {
            data: { user },
            error: authError,
        } = await supabase.auth.getUser()

        if (authError || !user) {
            return { success: false, error: 'Usuario no autenticado' }
        }

        // Verify post exists and get club_id
        const { data: post } = await supabase
            .from('posts')
            .select('club_id')
            .eq('id', validated.post_id)
            .single()

        if (!post) {
            return { success: false, error: 'Post no encontrado' }
        }

        // Add comment
        const comment = await addComment(validated, user.id)

        // Revalidate paths
        revalidatePath(`/clubs/${post.club_id}`)

        return { success: true, data: comment }
    } catch (error) {
        console.error('Error adding comment:', error)
        return {
            success: false,
            error:
                error instanceof Error ? error.message : 'Error al agregar comentario',
        }
    }
}

/**
 * Like a post
 */
export async function likePostAction(
    postId: string
): Promise<{ success: boolean; error?: string }> {
    try {
        // Get authenticated user
        const supabase = await createClient()
        const {
            data: { user },
            error: authError,
        } = await supabase.auth.getUser()

        if (authError || !user) {
            return { success: false, error: 'Usuario no autenticado' }
        }

        // Verify post exists and get club_id
        const { data: post } = await supabase
            .from('posts')
            .select('club_id')
            .eq('id', postId)
            .single()

        if (!post) {
            return { success: false, error: 'Post no encontrado' }
        }

        // Add like interaction
        await addPostInteraction(
            {
                post_id: postId,
                interaction_type: 'like',
            },
            user.id
        )

        // Revalidate paths
        revalidatePath(`/clubs/${post.club_id}`)

        return { success: true }
    } catch (error) {
        console.error('Error liking post:', error)
        // If already liked, treat as success
        if (
            error instanceof Error &&
            error.message.includes('already exists')
        ) {
            return { success: true }
        }
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Error al dar like',
        }
    }
}

/**
 * Unlike a post
 */
export async function unlikePostAction(
    postId: string
): Promise<{ success: boolean; error?: string }> {
    try {
        // Get authenticated user
        const supabase = await createClient()
        const {
            data: { user },
            error: authError,
        } = await supabase.auth.getUser()

        if (authError || !user) {
            return { success: false, error: 'Usuario no autenticado' }
        }

        // Verify post exists and get club_id
        const { data: post } = await supabase
            .from('posts')
            .select('club_id')
            .eq('id', postId)
            .single()

        if (!post) {
            return { success: false, error: 'Post no encontrado' }
        }

        // Remove like interaction
        await removePostInteraction(postId, user.id, 'like')

        // Revalidate paths
        revalidatePath(`/clubs/${post.club_id}`)

        return { success: true }
    } catch (error) {
        console.error('Error unliking post:', error)
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Error al quitar like',
        }
    }
}

/**
 * Superlike a post
 */
export async function superlikePostAction(
    postId: string
): Promise<{ success: boolean; error?: string }> {
    try {
        // Get authenticated user
        const supabase = await createClient()
        const {
            data: { user },
            error: authError,
        } = await supabase.auth.getUser()

        if (authError || !user) {
            return { success: false, error: 'Usuario no autenticado' }
        }

        // Check if user has superlikes available
        const { data: userPoints } = await supabase
            .from('usersPoints')
            .select('superlikes')
            .eq('user', user.id)
            .single()

        if (!userPoints || userPoints.superlikes <= 0) {
            return { success: false, error: 'No tienes superlikes disponibles' }
        }

        // Verify post exists and get club_id
        const { data: post } = await supabase
            .from('posts')
            .select('club_id')
            .eq('id', postId)
            .single()

        if (!post) {
            return { success: false, error: 'Post no encontrado' }
        }

        // Add superlike interaction
        await addPostInteraction(
            {
                post_id: postId,
                interaction_type: 'superlike',
            },
            user.id
        )

        // Decrement user superlikes
        await supabase.rpc('decrement_superlikes', {
            user_id_input: user.id,
            amount_input: 1,
        })

        // Revalidate paths
        revalidatePath(`/clubs/${post.club_id}`)
        revalidatePath('/profile')

        return { success: true }
    } catch (error) {
        console.error('Error superliking post:', error)
        // If already superliked, treat as error
        if (
            error instanceof Error &&
            error.message.includes('already exists')
        ) {
            return { success: false, error: 'Ya diste superlike a este post' }
        }
        return {
            success: false,
            error:
                error instanceof Error ? error.message : 'Error al dar superlike',
        }
    }
}
