'use client'

import { Image } from '@imagekit/next'
import MuxPlayer from '@mux/mux-player-react'
import { Loader2, AlertCircle } from "lucide-react"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Card } from "@/components/ui/card"
import type { EnrichedPost } from "@/types/post"

import PostActions from "./post-actions"
import PostHeader from "./post-header"

interface PostVideoProps {
  post: EnrichedPost
  availableSuperlikes: number
  onSuperlikePurchase: () => void
  onComment: () => void
  clubColor?: string
}

export default function PostVideo({
  post,
  availableSuperlikes,
  onSuperlikePurchase,
  onComment,
  clubColor,
}: PostVideoProps) {
  // Extract video metadata from post.content
  const videoData = post.content?.video
  const caption = post.content?.caption || post.content
  const status = videoData?.status || 'uploading'
  const playbackId = videoData?.mux_playback_id
  const thumbnailUrl = videoData?.thumbnail_url
  const errorMessage = videoData?.error_message

  return (
    <Card className="mb-4 overflow-hidden">
      <PostHeader
        id={post.id}
        user={post.user}
        createdAt={post.createdAt}
        clubColor={clubColor}
      />

      {/* Caption */}
      {caption && typeof caption === 'string' && (
        <div className="px-4 pb-3">
          <p className="text-sm">{caption}</p>
        </div>
      )}

      {/* Video Player / Status */}
      <div className="relative bg-black aspect-video">
        {/* Uploading State */}
        {status === 'uploading' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
            <Loader2 className="w-12 h-12 animate-spin mb-3" />
            <p className="text-sm font-medium">Subiendo video...</p>
            <p className="text-xs opacity-70 mt-1">Esto puede tomar unos minutos</p>
          </div>
        )}

        {/* Processing State */}
        {status === 'processing' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
            {thumbnailUrl && (
              <div className="absolute inset-0">
                <Image
                  src={thumbnailUrl}
                  alt="Video thumbnail"
                  fill
                  className="object-cover opacity-30"
                />
              </div>
            )}
            <div className="relative z-10 flex flex-col items-center">
              <Loader2 className="w-12 h-12 animate-spin mb-3" />
              <p className="text-sm font-medium">Procesando video...</p>
              <p className="text-xs opacity-70 mt-1">Casi listo para reproducir</p>
            </div>
          </div>
        )}

        {/* Ready State - Mux Player */}
        {status === 'ready' && playbackId && (
          <MuxPlayer
            playbackId={playbackId}
            poster={thumbnailUrl}
            streamType="on-demand"
            accentColor={clubColor || '#f97316'}
            className="w-full h-full"
            style={{ aspectRatio: '16/9' }}
          />
        )}

        {/* Error State */}
        {status === 'errored' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-white p-4">
            <AlertCircle className="w-12 h-12 mb-3 text-red-500" />
            <p className="text-sm font-medium mb-1">Error al procesar video</p>
            {errorMessage && (
              <p className="text-xs opacity-70 text-center">{errorMessage}</p>
            )}
          </div>
        )}
      </div>

      <PostActions
        postId={post.id}
        likesCount={post.likesCount}
        commentsCount={post.commentsCount}
        viewsCount={post.viewsCount}
        superlikesCount={post.superlikesCount}
        isLiked={post.isLiked}
        isSuperliked={post.isSuperliked}
        availableSuperlikes={availableSuperlikes}
        onSuperlikePurchase={onSuperlikePurchase}
        onComment={onComment}
      />
    </Card>
  )
}
