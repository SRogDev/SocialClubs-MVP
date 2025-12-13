"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Heart, Send } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"

interface Comment {
  id: string
  user: {
    name: string
    username: string
    avatar: string
  }
  content: string
  createdAt: string
  likes: number
  isLiked: boolean
}

interface CommentsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  postId: string
}

export default function CommentsModal({ open, onOpenChange, postId }: CommentsModalProps) {
  const [newComment, setNewComment] = useState("")
  const [comments, setComments] = useState<Comment[]>([
    {
      id: "1",
      user: {
        name: "María García",
        username: "mariagarcia",
        avatar: "/placeholder.svg?height=40&width=40",
      },
      content: "¡Excelente publicación! Me encantó la información que compartiste.",
      createdAt: "2h",
      likes: 5,
      isLiked: false,
    },
    {
      id: "2",
      user: {
        name: "Carlos Rodríguez",
        username: "carlosrodriguez",
        avatar: "/placeholder.svg?height=40&width=40",
      },
      content: "Muy interesante, gracias por compartir estos datos.",
      createdAt: "5h",
      likes: 2,
      isLiked: true,
    },
    {
      id: "3",
      user: {
        name: "Ana Martínez",
        username: "anamartinez",
        avatar: "/placeholder.svg?height=40&width=40",
      },
      content: "¿Alguien tiene más información sobre este tema? Me gustaría aprender más.",
      createdAt: "1d",
      likes: 8,
      isLiked: false,
    },
    {
      id: "4",
      user: {
        name: "Pedro López",
        username: "pedrolopez",
        avatar: "/placeholder.svg?height=40&width=40",
      },
      content: "Estoy de acuerdo con lo que mencionas. Muy buen análisis.",
      createdAt: "2d",
      likes: 3,
      isLiked: false,
    },
    {
      id: "5",
      user: {
        name: "Laura Sánchez",
        username: "laurasanchez",
        avatar: "/placeholder.svg?height=40&width=40",
      },
      content: "Me gustaría ver más contenido como este en el futuro.",
      createdAt: "3d",
      likes: 6,
      isLiked: false,
    },
  ])

  const handleLikeComment = (commentId: string) => {
    setComments(
      comments.map((comment) => {
        if (comment.id === commentId) {
          return {
            ...comment,
            isLiked: !comment.isLiked,
            likes: comment.isLiked ? comment.likes - 1 : comment.likes + 1,
          }
        }
        return comment
      }),
    )
  }

  const handleSubmitComment = () => {
    if (!newComment.trim()) return

    const newCommentObj: Comment = {
      id: `new-${Date.now()}`,
      user: {
        name: "Juan Pérez",
        username: "juanperez",
        avatar: "/placeholder.svg?height=40&width=40",
      },
      content: newComment,
      createdAt: "Ahora",
      likes: 0,
      isLiked: false,
    }

    setComments([newCommentObj, ...comments])
    setNewComment("")
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden">
        <DialogHeader className="px-4 py-2 border-b">
          <DialogTitle>Comentarios</DialogTitle>
        </DialogHeader>

        <ScrollArea className="h-[60vh] px-4">
          <div className="py-4 space-y-4">
            {comments.map((comment) => (
              <div key={comment.id} className="flex gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={comment.user.avatar || "/placeholder.svg"} alt={comment.user.name} />
                  <AvatarFallback>{comment.user.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="font-medium text-sm mr-2">{comment.user.username}</span>
                      <span className="text-sm">{comment.content}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => handleLikeComment(comment.id)}
                    >
                      <Heart
                        size={14}
                        className={comment.isLiked ? "fill-red-500 text-red-500" : "text-muted-foreground"}
                      />
                      <span className="sr-only">Me gusta</span>
                    </Button>
                  </div>
                  <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
                    <span>{comment.createdAt}</span>
                    <span>{comment.likes} me gusta</span>
                    <button className="hover:text-foreground transition-colors">Responder</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        <div className="p-3 border-t flex items-center gap-2">
          <Input
            placeholder="Añade un comentario..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            className="flex-1"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleSubmitComment()
              }
            }}
          />
          <Button size="icon" onClick={handleSubmitComment} disabled={!newComment.trim()}>
            <Send size={18} />
            <span className="sr-only">Enviar comentario</span>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
