"use client"

/**
 * Club List Example - Ejemplo de uso de hooks SWR para fetching
 * Patrón Repository: Hooks SWR solo para FETCH (GET)
 * 
 * ⚠️ NOTA: Este ejemplo usa useClubs que requiere implementar GET /api/clubs
 * Actualmente solo existe POST /api/clubs
 */

import { useClubs } from "@/hooks/swr"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export default function ClubListExample() {
    const { clubs, isLoading, isError } = useClubs()

    if (isLoading) {
        return (
            <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                    <Card key={i}>
                        <CardHeader>
                            <Skeleton className="h-6 w-3/4" />
                        </CardHeader>
                        <CardContent>
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-2/3 mt-2" />
                        </CardContent>
                    </Card>
                ))}
            </div>
        )
    }

    if (isError) {
        return (
            <div className="text-destructive text-center p-4">
                Error al cargar clubs
            </div>
        )
    }

    if (!clubs || clubs.length === 0) {
        return (
            <div className="text-muted-foreground text-center p-4">
                No hay clubs disponibles
            </div>
        )
    }

    return (
        <div className="space-y-4">
            {clubs.map((club) => (
                <Card key={club.id}>
                    <CardHeader>
                        <CardTitle>{club.name}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground">{club.bio}</p>
                    </CardContent>
                </Card>
            ))}
        </div>
    )
}
