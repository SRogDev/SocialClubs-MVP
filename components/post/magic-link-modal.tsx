"use client"

import { Link2, Send } from "lucide-react"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"

interface MagicLinkModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function MagicLinkModal({ open, onOpenChange }: MagicLinkModalProps) {
  const [title, setTitle] = useState("")
  const [url, setUrl] = useState("")
  const [isPublishing, setIsPublishing] = useState(false)
  const { toast } = useToast()

  const handlePublish = () => {
    if (!title.trim()) {
      toast({
        title: "Título requerido",
        description: "Por favor ingresa un título para tu Magic Link",
        variant: "destructive",
      })
      return
    }

    if (!url.trim() || !isValidUrl(url)) {
      toast({
        title: "URL inválida",
        description: "Por favor ingresa una URL válida",
        variant: "destructive",
      })
      return
    }

    setIsPublishing(true)

    // Simulamos el envío al chat
    setTimeout(() => {
      // Crear el componente Magic Link en el chat (simulado)
      console.log("Magic Link publicado:", { title, url })

      // Mostrar toast de éxito
      toast({
        title: "Magic Link publicado",
        description: "Tu Magic Link ha sido publicado en el chat",
      })

      // Cerrar el modal y resetear estados
      setIsPublishing(false)
      setTitle("")
      setUrl("")
      onOpenChange(false)

      // Simulamos la inserción del componente en el chat
      const magicLinkComponent = document.createElement("div")
      magicLinkComponent.innerHTML = `
        <div class="magic-link-preview">
          <div class="p-4 border rounded-lg shadow-sm bg-background">
            <div class="flex items-center mb-2">
              <Link2 size={16} className="mr-2 text-primary" />
              <h3 class="font-medium">${title}</h3>
            </div>
            <a href="${url}" target="_blank" rel="noopener noreferrer" class="block w-full">
              <button class="w-full bg-primary text-white rounded-md py-2 px-4 text-sm hover:bg-primary/90 transition-colors">
                Visitar enlace
              </button>
            </a>
          </div>
        </div>
      `

      // Aquí se insertaría en un chat real
    }, 1500)
  }

  const isValidUrl = (string: string) => {
    try {
      new URL(string)
      return true
    } catch (_) {
      return false
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Link2 className="mr-2 h-5 w-5 text-primary" />
            Crear Magic Link
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="title">Título</Label>
            <Input
              id="title"
              placeholder="Título de tu enlace"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="url">URL</Label>
            <Input id="url" placeholder="https://ejemplo.com" value={url} onChange={(e) => setUrl(e.target.value)} />
          </div>

          {/* Vista previa */}
          {title && url && (
            <div className="p-4 border rounded-lg bg-muted/30">
              <h4 className="text-sm font-medium mb-2">Vista previa:</h4>
              <div className="p-3 border rounded-md bg-background">
                <div className="flex items-center mb-2">
                  <Link2 size={16} className="mr-2 text-primary" />
                  <h3 className="font-medium text-sm">{title}</h3>
                </div>
                <Button variant="default" size="sm" className="w-full">
                  Visitar enlace
                </Button>
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handlePublish} disabled={isPublishing}>
            {isPublishing ? (
              "Publicando..."
            ) : (
              <>
                <Send size={16} className="mr-2" />
                Publicar
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
