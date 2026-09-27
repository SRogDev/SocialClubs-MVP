/**
 * Video Service - Mux integration for video upload, encoding, and playback
 */

import Mux from '@mux/mux-node'

import { createClient } from '@/lib/supabase/server'
import type { MuxVideoMetadata } from '@/schemas/videoSchema'

// Initialize Mux client
const mux = new Mux({
    tokenId: process.env.MUX_TOKEN_ID!,
    tokenSecret: process.env.MUX_TOKEN_SECRET!
})

/**
 * Create a Mux Direct Upload URL
 * User uploads video directly to Mux without going through our server
 */
export async function createMuxDirectUpload(metadata: {
    postId: string
    clubId: string
    userId: string
}): Promise<{ uploadUrl: string; assetId: string }> {
    try {
        // Create direct upload with Mux
        const upload = await mux.video.uploads.create({
            cors_origin: process.env.NEXT_PUBLIC_SITE_URL || '*',
            new_asset_settings: {
                playback_policy: ['public'], // Public URLs (no signed tokens for now)
                passthrough: JSON.stringify(metadata), // Metadata for webhook
                mp4_support: 'standard', // Generate MP4 for compatibility
            }
        })

        return {
            uploadUrl: upload.url,
            assetId: upload.asset_id || ''
        }
    } catch (error) {
        console.error('Error creating Mux direct upload:', error)
        throw new Error('Failed to create video upload URL')
    }
}

/**
 * Get Mux asset status
 */
export async function getMuxAssetStatus(assetId: string): Promise<{
    status: 'preparing' | 'ready' | 'errored'
    playbackId?: string
    duration?: number
    aspectRatio?: string
}> {
    try {
        const asset = await mux.video.assets.retrieve(assetId)

        return {
            status: asset.status as 'preparing' | 'ready' | 'errored',
            playbackId: asset.playback_ids?.[0]?.id,
            duration: asset.duration,
            aspectRatio: asset.aspect_ratio
        }
    } catch (error) {
        console.error('Error fetching Mux asset status:', error)
        throw new Error('Failed to fetch video status')
    }
}

/**
 * Delete Mux asset
 * Called when post is deleted
 */
export async function deleteMuxAsset(assetId: string): Promise<void> {
    try {
        await mux.video.assets.delete(assetId)
        console.log(`Mux asset deleted: ${assetId}`)
    } catch (error) {
        console.error('Error deleting Mux asset:', error)
        // Don't throw - we still want to delete the post even if Mux deletion fails
    }
}

/**
 * Update post with video metadata after encoding
 */
export async function updatePostVideoMetadata(
    postId: string,
    videoData: Partial<MuxVideoMetadata>
): Promise<void> {
    const supabase = await createClient()

    // Get current post content
    const { data: post, error: fetchError } = await supabase
        .from('posts')
        .select('content')
        .eq('id', postId)
        .single()

    if (fetchError || !post) {
        throw new Error('Post not found')
    }

    // Merge video metadata
    const updatedContent = {
        ...post.content,
        video: {
            ...post.content?.video,
            ...videoData
        }
    }

    // Update post
    const { error: updateError } = await supabase
        .from('posts')
        .update({ content: updatedContent })
        .eq('id', postId)

    if (updateError) {
        console.error('Error updating post video metadata:', updateError)
        throw new Error('Failed to update post with video data')
    }

    console.log(`Post ${postId} updated with video metadata:`, videoData)
}

/**
 * Generate thumbnail URL from Mux playback ID
 */
export function getMuxThumbnailUrl(
    playbackId: string,
    options: {
        width?: number
        height?: number
        time?: number
        fitMode?: 'preserve' | 'crop' | 'smartcrop'
    } = {}
): string {
    const { width = 640, height = 360, time = 1, fitMode = 'smartcrop' } = options

    return `https://image.mux.com/${playbackId}/thumbnail.jpg?width=${width}&height=${height}&time=${time}&fit_mode=${fitMode}`
}
