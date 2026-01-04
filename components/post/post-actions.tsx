"use client"

import { useState, useOptimistic } from "react"
import { Button } from "@/components/ui/button"
import { Heart, MessageCircle, Eye, Flame } from "lucide-react"
import { motion } from "framer-motion"
import { likePostAction, unlikePostAction, superlikePostAction } from "@/app/actions"
import { vibrate } from "@/utils/pwa"

interface PostActionsProps {
  postId: string
  likesCount: number
  commentsCount: number
  viewsCount: number
  superlikesCount: number
  isLiked?: boolean
  isSuperliked?: boolean
  availableSuperlikes: number
  onSuperlikePurchase: () => void
  onComment: () => void
  onSuperlike?: () => void
}

export default function PostActions({
  postId,
  likesCount,
  commentsCount,
  viewsCount,
  superlikesCount,
  isLiked = false,
  isSuperliked = false,
  availableSuperlikes,
  onSuperlikePurchase,
  onComment,
  onSuperlike,
}: PostActionsProps) {
  const [liked, setLiked] = useState(isLiked)
  const [superliked, setSuperliked] = useState(isSuperliked)
  const [showSuperlikeAnimation, setShowSuperlikeAnimation] = useState(false)
  const [currentLikes, setCurrentLikes] = useState(likesCount)
  const [currentSuperlikes, setCurrentSuperlikes] = useState(superlikesCount)

  const handleLike = async () => {
    // Optimistic UI update
    const newLikedState = !liked
    setLiked(newLikedState)
    setCurrentLikes(prev => newLikedState ? prev + 1 : prev - 1)
    vibrate([50])

    try {
      if (newLikedState) {
        await likePostAction(postId)
      } else {
        await unlikePostAction(postId)
      }
    } catch (error) {
      // Revert on error
      setLiked(!newLikedState)
      setCurrentLikes(likesCount)
      console.error('Error toggling like:', error)
    }
  }

  const handleSuperlike = async () => {
    if (superliked) return

    if (availableSuperlikes <= 0) {
      onSuperlikePurchase()
      return
    }

    // Optimistic UI update
    setSuperliked(true)
    setCurrentSuperlikes(prev => prev + 1)
    setShowSuperlikeAnimation(true)
    vibrate([50, 100, 50])
    setTimeout(() => setShowSuperlikeAnimation(false), 1000)

    try {
      const result = await superlikePostAction(postId)

      if (result.success) {
        onSuperlike?.()
      } else {
        // Revert on error
        setSuperliked(false)
        setCurrentSuperlikes(superlikesCount)

        if (result.error?.includes('superlikes disponibles')) {
          onSuperlikePurchase()
        }
      }
    } catch (error) {
      // Revert on error
      setSuperliked(false)
      setCurrentSuperlikes(superlikesCount)
      console.error('Error superliking post:', error)
    }
  }

  return (
    <div className="relative">
      {showSuperlikeAnimation && (
        <motion.div
          initial={{ scale: 0, opacity: 1 }}
          animate={{ scale: 3, opacity: 0 }}
          transition={{ duration: 1, ease: "easeOut" }}
          className="absolute inset-0 pointer-events-none flex items-center justify-center z-10"
        >
          <div className="w-20 h-20 rounded-full border-4 border-orange-400 bg-orange-400/20" />
        </motion.div>
      )}

      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-6">
          <Button
            variant="ghost"
            size="sm"
            className={`gap-1 p-0 h-auto ${liked ? "text-red-500" : ""}`}
            onClick={handleLike}
          >
            <Heart size={20} className={liked ? "fill-current" : ""} />
            <span className="text-sm">{currentLikes}</span>
          </Button>

          <Button variant="ghost" size="sm" className="gap-1 p-0 h-auto" onClick={onComment}>
            <MessageCircle size={20} />
            <span className="text-sm">{commentsCount}</span>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className={`gap-1 p-0 h-auto ${superliked ? "text-orange-500" : ""}`}
            onClick={handleSuperlike}
          >
            <Flame size={20} className={superliked ? "fill-current" : ""} />
            <span className="text-sm">{currentSuperlikes}</span>
          </Button>
        </div>

        <div className="flex items-center gap-1 text-muted-foreground">
          <Eye size={16} />
          <span className="text-sm">{viewsCount}</span>
        </div>
      </div>
    </div>
  )
}
