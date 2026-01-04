/**
 * Mux Webhook Handler
 * Handles events from Mux: video.asset.ready, video.asset.errored, etc.
 */

import { NextRequest, NextResponse } from 'next/server'
import Mux from '@mux/mux-node'
import { revalidatePath } from 'next/cache'
import { updatePostVideoMetadata, getMuxThumbnailUrl } from '@/services/videoService'
import { muxWebhookSchema } from '@/schemas/videoSchema'

const mux = new Mux({
    tokenId: process.env.MUX_TOKEN_ID!,
    tokenSecret: process.env.MUX_TOKEN_SECRET!
})

export async function POST(request: NextRequest) {
    try {
        // Get raw body and signature
        const body = await request.text()
        const signature = request.headers.get('mux-signature')

        // Verify webhook signature
        if (process.env.MUX_WEBHOOK_SECRET && signature) {
            try {
                const isValid = Mux.webhooks.verifySignature(
                    body,
                    signature,
                    process.env.MUX_WEBHOOK_SECRET
                )
                if (!isValid) {
                    console.error('Invalid Mux webhook signature')
                    return NextResponse.json(
                        { error: 'Invalid signature' },
                        { status: 401 }
                    )
                }
            } catch (error) {
                console.error('Error verifying webhook signature:', error)
                return NextResponse.json(
                    { error: 'Signature verification failed' },
                    { status: 401 }
                )
            }
        }

        // Parse payload
        const payload = muxWebhookSchema.parse(JSON.parse(body))
        console.log('Mux webhook received:', payload.type)

        // Extract metadata from passthrough
        const passthrough = payload.data.passthrough
            ? JSON.parse(payload.data.passthrough as string)
            : null

        // Handle different event types
        switch (payload.type) {
            case 'video.asset.ready': {
                // Video encoding completed successfully
                const assetId = payload.data.id as string
                const playbackIds = payload.data.playback_ids as Array<{ id: string; policy: string }>
                const playbackId = playbackIds?.[0]?.id
                const duration = payload.data.duration as number
                const aspectRatio = payload.data.aspect_ratio as string

                if (!passthrough?.postId) {
                    console.error('No postId in passthrough data')
                    return NextResponse.json({ error: 'Missing postId' }, { status: 400 })
                }

                // Update post with video metadata
                await updatePostVideoMetadata(passthrough.postId, {
                    mux_asset_id: assetId,
                    mux_playback_id: playbackId,
                    status: 'ready',
                    duration,
                    aspect_ratio: aspectRatio,
                    thumbnail_url: getMuxThumbnailUrl(playbackId)
                })

                // Revalidate club page
                if (passthrough.clubId) {
                    revalidatePath(`/home-clubs/${passthrough.clubId}`)
                }

                console.log(`Video ready for post ${passthrough.postId}`)
                break
            }

            case 'video.asset.errored': {
                // Video encoding failed
                const assetId = payload.data.id as string
                const errorMessage = payload.data.errors?.messages?.[0] || 'Unknown error'

                if (!passthrough?.postId) {
                    console.error('No postId in passthrough data')
                    return NextResponse.json({ error: 'Missing postId' }, { status: 400 })
                }

                // Update post with error status
                await updatePostVideoMetadata(passthrough.postId, {
                    mux_asset_id: assetId,
                    status: 'errored',
                    error_message: errorMessage
                })

                // Revalidate club page
                if (passthrough.clubId) {
                    revalidatePath(`/home-clubs/${passthrough.clubId}`)
                }

                console.error(`Video encoding failed for post ${passthrough.postId}:`, errorMessage)
                break
            }

            case 'video.upload.asset_created': {
                // Upload completed, encoding started
                console.log('Video upload completed, encoding started')

                if (passthrough?.postId) {
                    await updatePostVideoMetadata(passthrough.postId, {
                        status: 'processing'
                    })

                    // Revalidate club page
                    if (passthrough.clubId) {
                        revalidatePath(`/home-clubs/${passthrough.clubId}`)
                    }
                }
                break
            }

            case 'video.asset.deleted': {
                // Asset deleted (cleanup)
                console.log('Video asset deleted:', payload.data.id)
                break
            }

            default:
                console.log('Unhandled Mux event:', payload.type)
        }

        return NextResponse.json({ received: true }, { status: 200 })
    } catch (error) {
        console.error('Error processing Mux webhook:', error)
        return NextResponse.json(
            { error: 'Webhook processing failed' },
            { status: 500 }
        )
    }
}
