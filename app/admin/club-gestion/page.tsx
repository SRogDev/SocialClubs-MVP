import { ClubsGrid } from '@/components/admin/ClubsGrid'
import { adminService } from '@/services'

/**
 * Página de Club Gestión (Server Component)
 * Lista todos los clubs con filtros y búsqueda
 */
export default async function ClubGestionPage() {
    // Fetch clubs server-side
    const clubs = await adminService.getAllClubsWithDetails()

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Club Gestión</h1>
                <p className="text-muted-foreground">
                    Administra todos los clubs de la plataforma
                </p>
            </div>

            {/* Grid con filtros y cards */}
            <ClubsGrid clubs={clubs} />
        </div>
    )
}
