"use client"

import { useState, useEffect, useRef } from "react"
import useSWR from "swr"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Send, MessageCircle } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import { createClient } from "@/lib/supabase/client"
import { addCommentAction } from "@/app/actions/postActions"
import { useToast } from "@/hooks/use-toast"

/* ─── Types ────────────────────────────────────────────────────── */

interface RichComment {
  id: string
  post_id: string
  user_id: string
  content: string
  parent_comment_id: string | null
  created_at: string
  users: {
    name: string
    username: string
    avatar_url: string | null
  } | null
  isOptimistic?: boolean
}

interface CurrentUser {
  id: string
  name: string
  username: string
  avatar_url: string | null
}

interface CommentsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  postId: string
}

/* ─── Helpers ───────────────────────────────────────────────────── */

function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const secs = Math.floor(diff / 1000)
  if (secs < 60) return "Ahora"
  const mins = Math.floor(secs / 60)
  if (mins < 60) return `${mins}m`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d`
  return new Date(dateStr).toLocaleDateString("es", { day: "numeric", month: "short" })
}

const fetcher = (url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error("Failed to fetch")
    return r.json()
  }).then((r) => r.data as RichComment[])

/* ─── Skeleton ──────────────────────────────────────────────────── */

function CommentSkeleton() {
  return (
    <div className="flex gap-3 animate-pulse">
      <div className="h-8 w-8 rounded-full bg-muted shrink-0" />
      <div className="flex-1 space-y-2 pt-1">
        <div className="h-2.5 w-20 rounded-full bg-muted" />
        <div className="h-2.5 w-full rounded-full bg-muted" />
        <div className="h-2.5 w-2/3 rounded-full bg-muted" />
      </div>
    </div>
  )
}

/* ─── Main Component ────────────────────────────────────────────── */

export default function CommentsModal({ open, onOpenChange, postId }: CommentsModalProps) {
  const { toast } = useToast()
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  const [text, setText] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null)

  // Fetch comments — only when modal is open
  const { data: comments = [], isLoading, mutate } = useSWR<RichComment[]>(
    open && postId ? `/api/posts/${postId}/comments` : null,
    fetcher,
    { revalidateOnFocus: false }
  )

  // Fetch current user profile once on open
  useEffect(() => {
    if (!open || currentUser) return
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      supabase
        .from("users")
        .select("name, username, avatar_url")
        .eq("id", user.id)
        .single()
        .then(({ data }) => {
          if (data) {
            setCurrentUser({
              id: user.id,
              name: data.name ?? "",
              username: data.username ?? "",
              avatar_url: data.avatar_url ?? null,
            })
          }
        })
    })
  }, [open, currentUser])

  // Scroll to bottom when new comments appear
  useEffect(() => {
    if (!isLoading && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [comments, isLoading])

  const handleSubmit = async () => {
    const trimmed = text.trim()
    if (!trimmed || isSubmitting) return

    setText("")
    setIsSubmitting(true)

    // Optimistic insert
    const tempId = `optimistic-${Date.now()}`
    const optimistic: RichComment = {
      id: tempId,
      post_id: postId,
      user_id: currentUser?.id ?? "",
      content: trimmed,
      parent_comment_id: null,
      created_at: new Date().toISOString(),
      users: currentUser
        ? { name: currentUser.name, username: currentUser.username, avatar_url: currentUser.avatar_url }
        : null,
      isOptimistic: true,
    }

    mutate((current = []) => [...current, optimistic], { revalidate: false })

    const result = await addCommentAction({ post_id: postId, content: trimmed })

    if (result.success) {
      // Revalidate to replace optimistic with real data
      mutate()
    } else {
      // Revert optimistic comment
      mutate((current = []) => current?.filter((c) => c.id !== tempId), { revalidate: false })
      setText(trimmed)
      toast({ title: result.error ?? "Error al comentar", variant: "destructive" })
    }

    setIsSubmitting(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden flex flex-col max-h-[85dvh]">
        <DialogHeader className="px-4 py-3 border-b shrink-0">
          <DialogTitle className="text-base font-semibold">
            Comentarios
            {!isLoading && comments.length > 0 && (
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                {comments.length}
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        {/* Comment list */}
        <div className="flex-1 overflow-y-auto px-4" ref={scrollRef}>
          <div className="py-4 space-y-5">

            {/* Loading skeleton */}
            {isLoading && (
              <>
                <CommentSkeleton />
                <CommentSkeleton />
                <CommentSkeleton />
              </>
            )}

            {/* Empty state */}
            {!isLoading && comments.length === 0 && (
              <div className="flex flex-col items-center justify-center h-32 gap-2 text-center">
                <MessageCircle className="h-8 w-8 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">Sé el primero en comentar</p>
              </div>
            )}

            {/* Comments */}
            {comments.map((comment) => {
              const user = comment.users
              const displayName = user?.username ?? "usuario"
              const fullName = user?.name ?? ""
              const avatar = user?.avatar_url ?? ""
              const initials = (user?.name ?? "?").substring(0, 2).toUpperCase()

              return (
                <div
                  key={comment.id}
                  className={cn(
                    "flex gap-3 transition-opacity duration-300",
                    comment.isOptimistic && "opacity-60"
                  )}
                >
                  <Avatar className="h-8 w-8 shrink-0">
                    <AvatarImage src={avatar || "/placeholder.svg"} alt={fullName} />
                    <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm leading-snug">
                      <span className="font-semibold mr-1.5">@{displayName}</span>
                      <span className="text-foreground/90">{comment.content}</span>
                    </p>
                    <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
                      <span>{comment.isOptimistic ? "Enviando…" : formatRelativeTime(comment.created_at)}</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Input bar */}
        <div className="p-3 border-t shrink-0 flex items-end gap-2">
          {currentUser && (
            <Avatar className="h-7 w-7 shrink-0 mb-0.5">
              <AvatarImage src={currentUser.avatar_url ?? "/placeholder.svg"} />
              <AvatarFallback className="text-xs">
                {currentUser.name.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          )}

          <Textarea
            ref={textareaRef}
            placeholder="Añade un comentario…"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault()
                handleSubmit()
              }
            }}
            rows={1}
            className="flex-1 min-h-0 resize-none py-2 text-sm field-sizing-content max-h-32"
          />

          <Button
            size="icon"
            className="h-8 w-8 shrink-0 mb-0.5"
            onClick={handleSubmit}
            disabled={!text.trim() || isSubmitting}
          >
            <Send size={15} />
            <span className="sr-only">Enviar comentario</span>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
