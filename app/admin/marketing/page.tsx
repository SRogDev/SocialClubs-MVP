import { adminService } from '@/services'
import { MetricCard } from '@/components/admin/MetricCard'
import { EmailMarketingPanel } from '@/components/admin/EmailMarketingPanel'
import {
    TrendingUp,
    Mail,
    MousePointerClick,
    DollarSign,
    Users,
    Target,
} from 'lucide-react'

/**
 * Página de Marketing (Server Component)
 * Muestra estadísticas de marketing y panel de email marketing
 */
export default async function MarketingPage() {
    // Fetch marketing stats server-side
    const stats = await adminService.getMarketingStats()

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Marketing</h1>
                <p className="text-muted-foreground">
                    Estadísticas de marketing y herramientas de comunicación
                </p>
            </div>

            {/* Métricas de Marketing */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <MetricCard
                    title="Emails Enviados"
                    value={stats.total_emails_sent}
                    icon={Mail}
                    description="Total de emails enviados este mes"
                    trend={{ value: stats.email_growth, isPositive: stats.email_growth > 0 }}
                />
                <MetricCard
                    title="Tasa de Apertura"
                    value={`${stats.email_open_rate}%`}
                    icon={MousePointerClick}
                    description="Porcentaje de emails abiertos"
                    trend={{ value: (stats.email_open_rate - 20) / 20 * 100, isPositive: stats.email_open_rate > 20 }}
                />
                <MetricCard
                    title="Click Rate"
                    value={`${stats.email_click_rate}%`}
                    icon={Target}
                    description="Porcentaje de clicks en emails"
                    trend={{ value: (stats.email_click_rate - 5) / 5 * 100, isPositive: stats.email_click_rate > 5 }}
                />
                <MetricCard
                    title="Conversión de Marketing"
                    value={`${stats.marketing_conversion}%`}
                    icon={TrendingUp}
                    description="Usuarios que se suscribieron tras email"
                    trend={{ value: stats.marketing_conversion > 10 ? 15 : -5, isPositive: stats.marketing_conversion > 10 }}
                />
                <MetricCard
                    title="Revenue de Campañas"
                    value={`$${stats.campaign_revenue.toLocaleString()}`}
                    icon={DollarSign}
                    description="Ingresos generados por campañas"
                    trend={{ value: 12.5, isPositive: true }}
                />
                <MetricCard
                    title="Usuarios Activos"
                    value={stats.active_users}
                    icon={Users}
                    description="Usuarios que reciben marketing"
                    trend={{ value: 8.3, isPositive: true }}
                />
            </div>

            {/* Panel de Email Marketing */}
            <EmailMarketingPanel />
        </div>
    )
}
