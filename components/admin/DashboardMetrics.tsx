'use client'

import { Users, Building2, CreditCard, Activity, TrendingUp, Clock, Repeat, FileText, UserPlus } from 'lucide-react'

import type { PlatformMetrics } from '@/services/adminService'

import { MetricCard } from './MetricCard'

interface DashboardMetricsProps {
    metrics: PlatformMetrics
}

export function DashboardMetrics({ metrics }: DashboardMetricsProps) {
    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <MetricCard
                title="MAU (Monthly Active Users)"
                value={metrics.mau.toLocaleString()}
                icon={Users}
                description="Usuarios activos último mes"
                index={0}
            />

            <MetricCard
                title="DAU (Daily Active Users)"
                value={metrics.dau.toLocaleString()}
                icon={Activity}
                description="Usuarios activos hoy"
                index={1}
            />

            <MetricCard
                title="Total Clubs Activos"
                value={metrics.totalClubs.toLocaleString()}
                icon={Building2}
                description="Clubs con status activo"
                index={2}
            />

            <MetricCard
                title="Subscripciones Activas"
                value={metrics.activeSubscriptions.toLocaleString()}
                icon={CreditCard}
                description="Membresías pagadas activas"
                index={3}
            />

            <MetricCard
                title="Revenue Mensual"
                value={`$${(metrics.monthlyRevenue / 100).toLocaleString()}`}
                icon={TrendingUp}
                description="Ingresos del mes actual"
                index={4}
            />

            <MetricCard
                title="Avg Session Length"
                value={`${Math.floor(metrics.avgSessionLength / 60)}m`}
                icon={Clock}
                description="Duración promedio de sesión"
                index={5}
            />

            <MetricCard
                title="Retention Rate (30d)"
                value={`${metrics.retentionRate}%`}
                icon={Repeat}
                description="Usuarios que regresan"
                index={6}
            />

            <MetricCard
                title="Posts Hoy"
                value={metrics.postsToday.toLocaleString()}
                icon={FileText}
                description="Contenido creado hoy"
                index={7}
            />

            <MetricCard
                title="Nuevos Signups"
                value={metrics.newSignups.toLocaleString()}
                icon={UserPlus}
                description="Registros de hoy"
                index={8}
            />
        </div>
    )
}
