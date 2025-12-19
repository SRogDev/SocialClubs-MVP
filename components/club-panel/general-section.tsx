"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import DeleteClubButton from "@/components/club-panel/delete-club-button"
import { updateClubAction } from "@/app/actions"
import { useRouter } from "next/navigation"
import { vibratePattern } from "@/utils/pwa"

type Club = {
    id: string
    name: string
    imageUrl: string
    description: string
    color: string
}

type GeneralSectionProps = {
    club: Club
}

/**
 * General section component - manages club basic info and dangerous actions
 * Uses Server Actions for mutations (Repository Pattern)
 */
export default function GeneralSection({ club }: GeneralSectionProps) {
    const router = useRouter()
    const [name, setName] = useState(club.name)
    const [description, setDescription] = useState(club.description)
    const [welcomeMessage, setWelcomeMessage] = useState("")
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsSubmitting(true)
        setError(null)
        setSuccess(false)

        const result = await updateClubAction(club.id, {
            name,
            bio: description,
        })

        if (result.success) {
            vibratePattern([50, 100, 50])
            setSuccess(true)
            router.refresh()

            // Clear success message after 3 seconds
            setTimeout(() => setSuccess(false), 3000)
        } else {
            setError(result.error || 'Error al actualizar el club')
        }

        setIsSubmitting(false)
    }

    return (
        <div className="p-6 space-y-6">
            <h1 className="text-2xl font-bold">General</h1>

            <Card>
                <CardHeader>
                    <CardTitle>Información básica</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {error && (
                        <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md">
                            {error}
                        </div>
                    )}

                    {success && (
                        <div className="bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300 text-sm p-3 rounded-md">
                            Club actualizado exitosamente
                        </div>
                    )}

                    <div className="flex justify-center mb-4">
                        <Avatar className="h-24 w-24 ring-4" style={{ ['--tw-ring-color' as any]: `${club.color}40` }}>
                            <AvatarImage src={club.imageUrl} alt={club.name} />
                            <AvatarFallback style={{ backgroundColor: `${club.color}20`, color: club.color }}>
                                {club.name.substring(0, 2).toUpperCase()}
                            </AvatarFallback>
                        </Avatar>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Nombre del club</Label>
                            <Input
                                id="name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                disabled={isSubmitting}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="description">Descripción</Label>
                            <Textarea
                                id="description"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                rows={4}
                                disabled={isSubmitting}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="welcome">Mensaje de bienvenida</Label>
                            <Textarea
                                id="welcome"
                                value={welcomeMessage}
                                onChange={(e) => setWelcomeMessage(e.target.value)}
                                placeholder="Escribe el mensaje de bienvenida personalizado para tu club..."
                                rows={3}
                                disabled={isSubmitting}
                            />
                            <p className="text-xs text-muted-foreground">
                                Este mensaje será mostrado a los nuevos miembros la primera vez que entren al club.
                            </p>
                        </div>

                        <Button type="submit" className="w-full" disabled={isSubmitting}>
                            {isSubmitting ? "Guardando..." : "Guardar cambios"}
                        </Button>
                    </form>
                </CardContent>
            </Card>

            <Card className="border-destructive">
                <CardHeader>
                    <CardTitle className="text-destructive">Zona peligrosa</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                        Eliminar este club es una acción permanente que no se puede deshacer.
                        Todos los datos, posts, y miembros serán eliminados.
                    </p>
                    <DeleteClubButton clubId={club.id} clubName={club.name} />
                </CardContent>
            </Card>
        </div>
    )
}
