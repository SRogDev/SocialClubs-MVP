import { ChartWrapper } from '@/components/admin/chart-wrapper'
import { DashboardExportButton } from '@/components/admin/DashboardExportButton'
import { DashboardMetrics } from '@/components/admin/DashboardMetrics'
import { RevenueChart } from '@/components/admin/RevenueChart'
import { TopClubsChart } from '@/components/admin/TopClubsChart'
import { UserGrowthChart } from '@/components/admin/UserGrowthChart'
import chartData from '@/mock-data/admin-charts.json'
import { getPlatformMetrics } from '@/services/adminService'

/**
 * Admin Dashboard Principal (Global)
 * Server Component que muestra métricas principales de la plataforma
 */
export default async function AdminDashboard() {
    // Obtener métricas desde el servidor
    const metrics = await getPlatformMetrics()

    return (
        <div className="flex flex-col gap-6">
            {/* Header con export button */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
                    <p className="text-muted-foreground">
                        Métricas principales de SocialClubs
                    </p>
                </div>
                <DashboardExportButton />
            </div>

            {/* Grid de métricas principales */}
            <DashboardMetrics metrics={metrics} />

            {/* Gráficos */}
            <div className="grid gap-6 md:grid-cols-2">
                <ChartWrapper index={0}>
                    <RevenueChart data={chartData.revenueData} />
                </ChartWrapper>
                <ChartWrapper index={1}>
                    <UserGrowthChart data={chartData.userGrowthData} />
                </ChartWrapper>
            </div>

            <div className="grid gap-6">
                <ChartWrapper index={2}>
                    <TopClubsChart data={chartData.topClubsData} />
                </ChartWrapper>
            </div>
        </div>
    )
}
