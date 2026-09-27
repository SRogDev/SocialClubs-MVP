import { ClubModerationCard } from '@/components/admin/ClubModerationCard'
import { adminService } from '@/services'

/**
 * Página de Moderación (Server Component)
 * Muestra clubs con al menos 1 reporte, ordenados de mayor a menor
 */
export default async function ModerationPage() {
    // Fetch clubs with reports server-side
    const clubsWithReports = await adminService.getClubsWithReports()

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Moderación</h1>
                <p className="text-muted-foreground">
                    Clubs con reportes organizados de mayor a menor cantidad
                </p>
            </div>

            {/* Stats */}
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
                <span>
                    <strong className="text-foreground">{clubsWithReports.length}</strong> clubs reportados
                </span>
                <span>
                    <strong className="text-foreground">
                        {clubsWithReports.reduce((acc, club) => acc + club.reports.sexual_content, 0)}
                    </strong>{' '}
                    contenido sexual
                </span>
                <span>
                    <strong className="text-foreground">
                        {clubsWithReports.reduce((acc, club) => acc + club.reports.extreme_violence, 0)}
                    </strong>{' '}
                    violencia extrema
                </span>
                <span>
                    <strong className="text-foreground">
                        {clubsWithReports.reduce((acc, club) => acc + club.reports.scam, 0)}
                    </strong>{' '}
                    estafas
                </span>
                <span>
                    <strong className="text-foreground">
                        {clubsWithReports.reduce((acc, club) => acc + club.reports.spam, 0)}
                    </strong>{' '}
                    spam
                </span>
            </div>

            {/* Grid de Clubs con Reportes */}
            {clubsWithReports.length === 0 ? (
                <div className="flex h-64 items-center justify-center rounded-lg border border-dashed">
                    <div className="text-center">
                        <p className="text-lg font-semibold">No hay reportes pendientes</p>
                        <p className="text-sm text-muted-foreground">
                            La plataforma está libre de reportes activos
                        </p>
                    </div>
                </div>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {clubsWithReports.map((club) => (
                        <ClubModerationCard key={club.id} club={club} />
                    ))}
                </div>
            )}
        </div>
    )
}
