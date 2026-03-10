"use client"

import type React from "react"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Camera } from "lucide-react"
import { updateProfileAction, uploadProfileImageAction } from "@/app/actions"
import { useRouter } from "next/navigation"
import { vibrate } from "@/utils/pwa"

interface Profile {
  name: string
  username: string
  description: string
  imageUrl: string
}

interface EditProfileModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  profile: Profile
}

export default function EditProfileModal({ open, onOpenChange, profile }: EditProfileModalProps) {
  const router = useRouter()
  const [name, setName] = useState(profile.name)
  const [username, setUsername] = useState(profile.username)
  const [description, setDescription] = useState(profile.description)
  const [imageUrl, setImageUrl] = useState(profile.imageUrl)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsSubmitting(true)
    setError(null)

    const result = await uploadProfileImageAction(file)

    if (result.success && result.url) {
      setImageUrl(result.url)
      vibrate([50])
    } else {
      setError(result.error || 'Error al subir imagen')
    }

    setIsSubmitting(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    // Optimistic: close modal immediately and refresh in background
    vibrate([50, 100, 50])
    onOpenChange(false)

    const result = await updateProfileAction({
      name,
      username,
      bio: description,
      avatar_url: imageUrl,
    })

    if (result.success) {
      router.refresh()
    } else {
      setError(result.error || 'Error al actualizar perfil')
      onOpenChange(true) // Reopen modal on error
    }

    setIsSubmitting(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center font-sans">Editar perfil</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
              <span>{error}</span>
            </div>
          )}

          <div className="flex justify-center mb-6">
            <div className="relative">
              <Avatar className="h-24 w-24 border-2 border-amber-200 dark:border-amber-800">
                <AvatarImage src={imageUrl || "/placeholder.svg"} alt={name} className="object-cover" />
                <AvatarFallback>{name.substring(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <label htmlFor="image-upload">
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  className="absolute bottom-0 right-0 rounded-full h-8 w-8 bg-background cursor-pointer"
                  asChild
                >
                  <span>
                    <Camera size={16} />
                    <span className="sr-only">Cambiar foto</span>
                  </span>
                </Button>
              </label>
              <input
                id="image-upload"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageChange}
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Nombre</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Tu nombre completo"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="username">Nombre de usuario</Label>
            <div className="flex items-center">
              <span className="text-muted-foreground mr-1">@</span>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="username"
                required
                className="flex-1"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descripción</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Cuéntanos sobre ti"
              rows={4}
            />
          </div>

          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="w-full sm:w-auto">
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
              {isSubmitting ? (
                <><span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden /> Guardando...</>
              ) : "Guardar cambios"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
