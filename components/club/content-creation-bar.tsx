"use client"

import { MessageSquare, ImageIcon, Video, FileAudio, BarChart2, PuzzleIcon } from "lucide-react"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

interface ContentCreationBarProps {
  clubColor?: string
}

export default function ContentCreationBar({ clubColor = "#f97316" }: ContentCreationBarProps) {
  const [showContentModal, setShowContentModal] = useState(false)
  const [contentType, setContentType] = useState<string>("")

  const handleContentClick = (type: string) => {
    setContentType(type)
    setShowContentModal(true)
  }

  return (
    <>
      <div className="p-3">
        <div className="flex justify-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-10 w-10 p-0 hover:scale-110 transition-transform"
            onClick={() => handleContentClick("text")}
          >
            <MessageSquare size={20} style={{ color: clubColor }} />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className="h-10 w-10 p-0 hover:scale-110 transition-transform"
            onClick={() => handleContentClick("image")}
          >
            <ImageIcon size={20} style={{ color: clubColor }} />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className="h-10 w-10 p-0 hover:scale-110 transition-transform"
            onClick={() => handleContentClick("video")}
          >
            <Video size={20} style={{ color: clubColor }} />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className="h-10 w-10 p-0 hover:scale-110 transition-transform"
            onClick={() => handleContentClick("audio")}
          >
            <FileAudio size={20} style={{ color: clubColor }} />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className="h-10 w-10 p-0 hover:scale-110 transition-transform"
            onClick={() => handleContentClick("poll")}
          >
            <BarChart2 size={20} style={{ color: clubColor }} />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className="h-10 w-10 p-0 hover:scale-110 transition-transform"
            onClick={() => handleContentClick("widget")}
          >
            <PuzzleIcon size={20} style={{ color: clubColor }} />
          </Button>
        </div>
      </div>

      <Dialog open={showContentModal} onOpenChange={setShowContentModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Crear Contenido</DialogTitle>
          </DialogHeader>
          <div className="py-8 text-center">
            <div className="mb-4">
              <div
                className="w-16 h-16 rounded-full mx-auto flex items-center justify-center"
                style={{ backgroundColor: `${clubColor}20` }}
              >
                <div
                  className="w-8 h-8 rounded-full animate-spin border-2 border-transparent"
                  style={{ borderTopColor: clubColor }}
                />
              </div>
            </div>
            <h3 className="text-lg font-semibold mb-2">Cargando contenido...</h3>
            <p className="text-sm text-muted-foreground">Preparando el editor para {contentType}</p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
