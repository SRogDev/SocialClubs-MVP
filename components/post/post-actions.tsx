"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Heart, MessageCircle, Eye, Flame } from "lucide-react"
import { motion } from "framer-motion"

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

  const handleLike = () => {
    setLiked(!liked)
  }

  const handleSuperlike = () => {
    if (availableSuperlikes > 0) {
      setSuperliked(!superliked)
      setShowSuperlikeAnimation(true)
      setTimeout(() => setShowSuperlikeAnimation(false), 1000)
      onSuperlike?.()
    } else {
      onSuperlikePurchase()
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
            <span className="text-sm">{likesCount + (liked && !isLiked ? 1 : 0)}</span>
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
            <span className="text-sm">{superlikesCount + (superliked && !isSuperliked ? 1 : 0)}</span>
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
