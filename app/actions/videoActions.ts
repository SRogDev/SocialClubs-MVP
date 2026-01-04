/**
 * Video Actions - Server Actions for video upload workflow
 */

'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createMuxDirectUpload } from '@/services/videoService'
import { createVideoUploadSchema, type CreateVideoUploadInput } from '@/schemas/videoSchema'

/**
 * Create a video upload and get Direct Upload URL
 * Creates a preliminary post with status 'uploading'
 */
export async function createVideoUploadAction(
    input: CreateVideoUploadInput
): Promise<{
    success: boolean
    data?: { postId: string; uploadUrl: string; assetId: string }
    error?: string
}> {
    try {
        // Validate input
        const validated = createVideoUploadSchema.parse(input)

        // Get authenticated user
        const supabase = await createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return { success: false, error: 'Usuario no autenticado' }
        }

        // Verify user is member of club
        const { data: membership } = await supabase
            .from('users_clubs')
            .select('id')
            .eq('user_id', user.id)
            .eq('club_id', validated.club_id)
            .single()

        if (!membership) {
            return { success: false, error: 'No eres miembro de este club' }
        }

        // Create preliminary post with 'uploading' status
        const { data: post, error: postError } = await supabase
            .from('posts')
            .insert({
                club_id: validated.club_id,
                type: 'video',
                content: {
                    caption: validated.caption || '',
                    video: {
                        status: 'uploading',
                        mux_asset_id: '', // Will be filled after upload
                        mux_playback_id: ''
                    }
                }
            })
            .select()
            .single()

        if (postError || !post) {
            console.error('Error creating post:', postError)
            return { success: false, error: 'Error al crear post' }
        }

        // Create Mux Direct Upload URL
        const { uploadUrl, assetId } = await createMuxDirectUpload({
            postId: post.id,
            clubId: validated.club_id,
            userId: user.id
        })

        // Update post with asset ID
        const { error: updateError } = await supabase
            .from('posts')
            .update({
                content: {
                    ...post.content,
                    video: {
                        ...post.content.video,
                        mux_asset_id: assetId
                    }
                }
            })
            .eq('id', post.id)

        if (updateError) {
            console.error('Error updating post with asset ID:', updateError)
            return { success: false, error: 'Error al actualizar post' }
        }

        // Revalidate club page
        revalidatePath(`/home-clubs/${validated.club_id}`)

        return {
            success: true,
            data: {
                postId: post.id,
                uploadUrl,
                assetId
            }
        }
    } catch (error) {
        console.error('Error in createVideoUploadAction:', error)
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Error desconocido'
        }
    }
}

/**
 * Cancel video upload
 * Deletes the preliminary post if user cancels before upload completes
 */
export async function cancelVideoUploadAction(
    postId: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const supabase = await createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return { success: false, error: 'Usuario no autenticado' }
        }

        // Get post to verify ownership via club membership
        const { data: post } = await supabase
            .from('posts')
            .select('club_id')
            .eq('id', postId)
            .single()

        if (!post) {
            return { success: false, error: 'Post no encontrado' }
        }

        // Delete post
        const { error: deleteError } = await supabase
            .from('posts')
            .delete()
            .eq('id', postId)

        if (deleteError) {
            console.error('Error deleting post:', deleteError)
            return { success: false, error: 'Error al cancelar upload' }
        }

        // Revalidate club page
        revalidatePath(`/home-clubs/${post.club_id}`)

        return { success: true }
    } catch (error) {
        console.error('Error in cancelVideoUploadAction:', error)
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Error desconocido'
        }
    }
}
