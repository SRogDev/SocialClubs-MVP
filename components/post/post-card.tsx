"use client"

import { Image } from "@imagekit/next"
import { motion, AnimatePresence } from "framer-motion"
import { Heart, MessageCircle, Eye, Flame, Play, Pause } from "lucide-react"
import { useState } from "react"

import { likePostAction, unlikePostAction, superlikePostAction } from "@/app/actions/postActions"
import CommentsModal from "@/components/post/comments-modal"
import SuperlikeModal from "@/components/post/superlike-modal"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import WidgetPost from "@/components/widgets/widget-post"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import { vibrate } from "@/utils/pwa"

/* ─── Extracted: Superlike Animation ──────────────────────────── */
function SuperlikeAnimation({ show }: { show: boolean }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="absolute inset-0 flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <motion.div
            className="relative"
            initial={{ scale: 0.5 }}
            animate={{ scale: 1.5 }}
            exit={{ scale: 0.5 }}
            transition={{ duration: 0.5 }}
          >
            <Flame className="text-orange-500 h-16 w-16 z-10 relative" />
            <motion.div
              className="absolute inset-0 flex items-center justify-center"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: [0.8, 1.5, 2], opacity: [0, 0.8, 0] }}
              transition={{ duration: 1.2, times: [0, 0.5, 1], repeat: 1 }}
            >
              <div className="h-full w-full rounded-full bg-gradient-to-r from-orange-500 to-red-500 blur-md" />
            </motion.div>
          </motion.div>
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-orange-500/20 to-red-500/20"
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: [0, 0.3, 0], scale: [0, 1, 1.2] }}
            transition={{ duration: 1, times: [0, 0.5, 1] }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/* ─── Extracted: Overlay Interaction Buttons ──────────────────── */
interface OverlayButtonsProps {
  liked: boolean
  superliked: boolean
  likes: number
  commentsCount: number
  superlikes: number
  onLike: () => void
  onComment: () => void
  onSuperlike: () => void
}

function OverlayInteractionButtons({
  liked, superliked, likes, commentsCount, superlikes,
  onLike, onComment, onSuperlike,
}: OverlayButtonsProps) {
  return (
    <div className="absolute bottom-4 right-4 flex flex-col items-center gap-3">
      <Button
        variant="ghost"
        size="sm"
        className={cn(
          "h-12 w-12 p-0 transition-colors bg-black/20 hover:bg-black/40 backdrop-blur-sm rounded-full",
          liked && "text-red-500 hover:text-red-600",
        )}
        onClick={onLike}
      >
        <div className="flex flex-col items-center">
          <Heart size={24} className={cn("transition-transform hover:scale-110 text-white", liked && "fill-current text-red-500")} />
          <span className="text-xs mt-1 text-white font-medium">{likes}</span>
        </div>
      </Button>

      <Button
        variant="ghost"
        size="sm"
        className="h-12 w-12 p-0 transition-colors bg-black/20 hover:bg-black/40 backdrop-blur-sm rounded-full"
        onClick={onComment}
      >
        <div className="flex flex-col items-center">
          <MessageCircle size={24} className="transition-transform hover:scale-110 text-white" />
          <span className="text-xs mt-1 text-white font-medium">{commentsCount}</span>
        </div>
      </Button>

      <Button
        variant="ghost"
        size="sm"
        className={cn(
          "h-12 w-12 p-0 transition-colors bg-black/20 hover:bg-black/40 backdrop-blur-sm rounded-full",
          superliked && "text-orange-500 hover:text-orange-600",
        )}
        onClick={onSuperlike}
        disabled={superliked}
      >
        <div className="flex flex-col items-center">
          <div className={cn("relative transition-transform hover:scale-110")}>
            <Flame size={24} className={cn("text-white", superliked && "text-orange-500")} />
            {superliked && <div className="absolute inset-0 rounded-full border border-orange-500 animate-pulse" />}
          </div>
          <span className="text-xs mt-1 text-white font-medium">{superlikes}</span>
        </div>
      </Button>
    </div>
  )
}

/* ─── Extracted: Text Post Interaction Buttons ────────────────── */
function TextInteractionButtons({
  liked, superliked, likes, commentsCount, superlikes,
  onLike, onComment, onSuperlike,
}: OverlayButtonsProps) {
  return (
    <div className="absolute top-0 right-0 flex flex-col items-center gap-3">
      <Button
        variant="ghost"
        size="sm"
        className={cn("h-10 w-10 p-0 transition-colors", liked && "text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20")}
        onClick={onLike}
      >
        <div className="flex flex-col items-center">
          <Heart size={20} className={cn("transition-transform hover:scale-110", liked && "fill-current")} />
          <span className="text-xs mt-1">{likes}</span>
        </div>
      </Button>

      <Button variant="ghost" size="sm" className="h-10 w-10 p-0 transition-colors hover:bg-accent/80" onClick={onComment}>
        <div className="flex flex-col items-center">
          <MessageCircle size={20} className="transition-transform hover:scale-110" />
          <span className="text-xs mt-1">{commentsCount}</span>
        </div>
      </Button>

      <Button
        variant="ghost"
        size="sm"
        className={cn("h-10 w-10 p-0 transition-colors", superliked && "text-orange-500 hover:text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20")}
        onClick={onSuperlike}
        disabled={superliked}
      >
        <div className="flex flex-col items-center">
          <div className={cn("relative transition-transform hover:scale-110")}>
            <Flame size={20} className={cn(superliked && "text-orange-500")} />
            {superliked && <div className="absolute inset-0 rounded-full border border-orange-500 animate-pulse" />}
          </div>
          <span className="text-xs mt-1">{superlikes}</span>
        </div>
      </Button>
    </div>
  )
}

/* ─── Main PostCard Component ─────────────────────────────────── */

interface PostCardProps {
  id: string
  user: {
    name: string
    username: string
    avatar: string
  }
  content: string
  imageUrl?: string
  videoUrl?: string
  audioUrl?: string
  audioName?: string
  createdAt: string
  likesCount: number
  commentsCount: number
  viewsCount: number
  superlikesCount: number
  isLiked?: boolean
  isSuperliked?: boolean
  availableSuperlikes: number
  onSuperlikePurchase?: () => void
  isInsideClub?: boolean
  type?: "image" | "video" | "audio" | "text" | "widget"
  clubWidgetId?: string
  userId?: string | null
}

export default function PostCard({
  id,
  user,
  content,
  imageUrl,
  videoUrl,
  audioUrl,
  audioName,
  createdAt,
  likesCount,
  commentsCount,
  viewsCount,
  superlikesCount,
  isLiked = false,
  isSuperliked = false,
  availableSuperlikes,
  onSuperlikePurchase,
  isInsideClub = false,
  type = "image",
  clubWidgetId,
  userId,
}: PostCardProps) {
  const { toast } = useToast()
  const [liked, setLiked] = useState(isLiked)
  const [superliked, setSuperliked] = useState(isSuperliked)
  const [likes, setLikes] = useState(likesCount)
  const [superlikes, setSuperlikes] = useState(superlikesCount)
  const [showSuperlikeAnimation, setShowSuperlikeAnimation] = useState(false)
  const [availableSuperlikesCount, setAvailableSuperlikesCount] = useState(availableSuperlikes)
  const [showSuperlikeModal, setShowSuperlikeModal] = useState(false)
  const [showCommentsModal, setShowCommentsModal] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)

  const handleLike = async () => {
    const wasLiked = liked
    const wasLikes = likes
    // Optimistic
    setLiked(!wasLiked)
    setLikes(wasLiked ? wasLikes - 1 : wasLikes + 1)
    vibrate([20])

    const result = await (wasLiked ? unlikePostAction(id) : likePostAction(id))
    if (!result.success) {
      // Revert
      setLiked(wasLiked)
      setLikes(wasLikes)
      toast({ title: result.error ?? "Error al procesar", variant: "destructive" })
    }
  }

  const handleSuperlike = async () => {
    if (superliked) return

    if (availableSuperlikesCount > 0) {
      // Optimistic
      setSuperlikes((s) => s + 1)
      setSuperliked(true)
      setAvailableSuperlikesCount((c) => c - 1)
      setShowSuperlikeAnimation(true)
      vibrate([30, 50, 30])
      setTimeout(() => setShowSuperlikeAnimation(false), 1500)

      const result = await superlikePostAction(id)
      if (!result.success) {
        // Revert
        setSuperlikes((s) => s - 1)
        setSuperliked(false)
        setAvailableSuperlikesCount((c) => c + 1)
        toast({ title: result.error ?? "Error al dar superlike", variant: "destructive" })
      }
    } else {
      setShowSuperlikeModal(true)
    }
  }

  const handleComment = () => setShowCommentsModal(true)

  const handlePurchaseSuperlikes = () => {
    onSuperlikePurchase?.()
    setShowSuperlikeModal(false)
  }

  const togglePlayPause = () => setIsPlaying(!isPlaying)

  const interactionProps: OverlayButtonsProps = {
    liked, superliked, likes, commentsCount, superlikes,
    onLike: handleLike, onComment: handleComment, onSuperlike: handleSuperlike,
  }

  if (isInsideClub) {
    return (
      <div className="w-full bg-background border-b border-border/50 relative">
        {/* Header */}
        <div className="p-4 pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Avatar className="h-10 w-10 mr-3">
                <AvatarImage src={user.avatar || "/placeholder.svg"} alt={user.name} />
                <AvatarFallback>{user.name.substring(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <p className="font-medium">{user.name}</p>
                <p className="text-xs text-muted-foreground">@{user.username} · {createdAt}</p>
              </div>
            </div>
            <div className="flex items-center text-sm text-muted-foreground">
              <span className="mr-1">{viewsCount}</span>
              <Eye size={16} />
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-4 pb-4 relative">
          {type === "widget" && clubWidgetId ? (
            <WidgetPost clubWidgetId={clubWidgetId} userId={userId ?? null} />
          ) : (
            <>
              {content && (
                <p className={cn("mb-4", type === "text" && "text-lg leading-relaxed py-4 text-center")}>{content}</p>
              )}

              {/* Image */}
          {type === "image" && imageUrl && (
            <div className="relative w-full aspect-[4/5] overflow-hidden rounded-lg">
              <Image src={imageUrl} alt="Imagen del post" fill className="object-cover" sizes="(max-width: 768px) 100vw, 600px" />
              <OverlayInteractionButtons {...interactionProps} />
              <SuperlikeAnimation show={showSuperlikeAnimation} />
            </div>
          )}

          {/* Video */}
          {type === "video" && videoUrl && (
            <div className="relative w-full aspect-[4/5] overflow-hidden rounded-lg bg-black">
              <Image src={videoUrl} alt="Miniatura del video" fill className="object-cover" sizes="(max-width: 768px) 100vw, 600px" />
              <div className="absolute inset-0 flex items-center justify-center">
                <Button variant="ghost" size="icon" className="h-16 w-16 rounded-full bg-black/30 hover:bg-black/50 text-white" onClick={togglePlayPause}>
                  {isPlaying ? <Pause size={32} /> : <Play size={32} />}
                </Button>
              </div>
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-muted">
                <div className="h-full bg-primary w-1/3" />
              </div>
              <OverlayInteractionButtons {...interactionProps} />
            </div>
          )}

          {/* Audio */}
          {type === "audio" && (
            <div className="relative w-full aspect-[4/5] overflow-hidden rounded-lg bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
              <div className="absolute top-4 left-4 right-16 z-10">
                <h3 className="text-white font-bold text-lg leading-tight">{audioName || "Audio"}</h3>
              </div>
              <div className="absolute inset-0 flex items-end justify-center px-8 pb-20">
                <div className="flex items-end justify-between w-full h-3/4 gap-1">
                  {[...Array(40)].map((_, i) => {
                    const height = Math.sin(i * 0.3) * 60 + 40
                    return (
                      <div
                        key={i}
                        className={`bg-gradient-to-t from-white to-white/60 rounded-full transition-all duration-300 ${isPlaying ? "animate-pulse" : ""}`}
                        style={{ width: "3px", height: `${height}%`, opacity: i % 3 === 0 ? 0.4 : i % 2 === 0 ? 0.7 : 1, animationDelay: `${i * 0.05}s` }}
                      />
                    )
                  })}
                </div>
              </div>
              <div className="absolute bottom-4 left-4">
                <Button variant="ghost" size="icon" className="h-12 w-12 rounded-full bg-white/20 hover:bg-white/30 text-white backdrop-blur-sm" onClick={togglePlayPause}>
                  {isPlaying ? <Pause size={24} /> : <Play size={24} />}
                </Button>
              </div>
              <OverlayInteractionButtons {...interactionProps} />
            </div>
          )}

          {/* Text only */}
          {type === "text" && (
            <div className="relative">
              <TextInteractionButtons {...interactionProps} />
              <SuperlikeAnimation show={showSuperlikeAnimation} />
            </div>
          )}
            </>
          )}
        </div>

        <SuperlikeModal open={showSuperlikeModal} onOpenChange={setShowSuperlikeModal} onPurchase={handlePurchaseSuperlikes} />
        <CommentsModal open={showCommentsModal} onOpenChange={setShowCommentsModal} postId={id} />
      </div>
    )
  }

  // ─── Feed card layout (outside club) ────────────────────────
  return (
    <Card className="mb-4 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      <CardHeader className="p-4 pb-0">
        <div className="flex items-center">
          <Avatar className="h-10 w-10 mr-3">
            <AvatarImage src={user.avatar || "/placeholder.svg"} alt={user.name} />
            <AvatarFallback>{user.name.substring(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium">{user.name}</p>
            <p className="text-xs text-muted-foreground">@{user.username} · {createdAt}</p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 relative">
        {content && <p className="mb-4">{content}</p>}
        <div className="absolute top-4 right-4 flex items-center text-sm text-muted-foreground">
          <span className="mr-1">{viewsCount}</span>
          <Eye size={16} />
        </div>
        {imageUrl && (
          <div className="relative rounded-md overflow-hidden">
            <Image src={imageUrl} alt="Post content" width={600} height={400} className="w-full h-auto object-cover rounded-md" />
            <SuperlikeAnimation show={showSuperlikeAnimation} />
          </div>
        )}
        {videoUrl && <video src={videoUrl} controls className="w-full h-auto rounded-md" />}
        {audioUrl && <audio src={audioUrl} controls className="w-full mt-2" />}
      </CardContent>

      <CardFooter className="p-2 border-t flex justify-between">
        <Button
          variant="ghost" size="sm"
          className={cn("flex-1 transition-colors", liked && "text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20")}
          onClick={handleLike}
        >
          <Heart size={18} className={cn("mr-1 transition-transform hover:scale-110", liked && "fill-current")} />
          <span>{likes}</span>
        </Button>
        <Button variant="ghost" size="sm" className="flex-1 transition-colors hover:bg-accent/80" onClick={handleComment}>
          <MessageCircle size={18} className="mr-1 transition-transform hover:scale-110" />
          <span>{commentsCount}</span>
        </Button>
        <Button
          variant="ghost" size="sm"
          className={cn("flex-1 transition-colors", superliked && "text-orange-500 hover:text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20")}
          onClick={handleSuperlike}
          disabled={superliked}
        >
          <div className={cn("relative mr-1 transition-transform hover:scale-110")}>
            <Flame size={18} className={cn(superliked && "text-orange-500")} />
            {superliked && <div className="absolute inset-0 rounded-full border border-orange-500 animate-pulse" />}
          </div>
          <span>{superlikes}</span>
        </Button>
      </CardFooter>

      <SuperlikeModal open={showSuperlikeModal} onOpenChange={setShowSuperlikeModal} onPurchase={handlePurchaseSuperlikes} />
      <CommentsModal open={showCommentsModal} onOpenChange={setShowCommentsModal} postId={id} />
    </Card>
  )
}
