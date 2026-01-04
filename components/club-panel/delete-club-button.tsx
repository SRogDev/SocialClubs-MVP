"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { useClubDelete } from "@/hooks/use-club-actions"
import { vibrate } from "@/utils/pwa"

type DeleteClubButtonProps = {
    clubId: string
    clubName: string
}

/**
 * Delete Club Button - Allows club creators to delete their clubs
 * Includes confirmation dialog and PostHog tracking
 */
export default function DeleteClubButton({ clubId, clubName }: DeleteClubButtonProps) {
    const router = useRouter()
    const [open, setOpen] = useState(false)
    const { deleteClub, loading, error } = useClubDelete()

    const handleDelete = async () => {
        try {
            // Vibration feedback
            vibrate([50, 100, 50])

            await deleteClub(clubId)

            // Close dialog and redirect
            setOpen(false)
            router.push("/clubs")
            router.refresh()
        } catch (err) {
            console.error("Error deleting club:", err)
            // Error is already set in the hook
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button
                    variant="destructive"
                    className="w-full"
                    disabled={loading}
                >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Eliminar Club
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>¿Eliminar club?</DialogTitle>
                    <DialogDescription className="space-y-2">
                        <p>
                            Estás a punto de eliminar permanentemente el club{" "}
                            <strong className="text-foreground">{clubName}</strong>.
                        </p>
                        <p className="text-destructive font-medium">
                            Esta acción no se puede deshacer. Se eliminarán:
                        </p>
                        <ul className="list-disc list-inside text-sm space-y-1 pl-2">
                            <li>Todos los posts y contenido del club</li>
                            <li>Todas las membresías de usuarios</li>
                            <li>Todos los canales y configuraciones</li>
                            <li>Estadísticas e información del club</li>
                        </ul>
                    </DialogDescription>
                </DialogHeader>
                {error && (
                    <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md">
                        {error}
                    </div>
                )}
                <DialogFooter className="gap-2 sm:gap-0">
                    <Button
                        variant="outline"
                        onClick={() => setOpen(false)}
                        disabled={loading}
                    >
                        Cancelar
                    </Button>
                    <Button
                        variant="destructive"
                        onClick={handleDelete}
                        disabled={loading}
                    >
                        {loading ? "Eliminando..." : "Sí, eliminar club"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
