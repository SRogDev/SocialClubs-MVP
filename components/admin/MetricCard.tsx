'use client'

import { LucideIcon, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface MetricCardProps {
    title: string
    value: string | number
    icon: LucideIcon
    trend?: {
        value: number // Porcentaje de cambio
        isPositive?: boolean // Si el cambio es positivo o negativo
    }
    description?: string
    className?: string
}

export function MetricCard({
    title,
    value,
    icon: Icon,
    trend,
    description,
    className,
}: MetricCardProps) {
    const getTrendIcon = () => {
        if (!trend) return null
        if (trend.value === 0) return <Minus className="h-4 w-4" />
        return trend.isPositive ? (
            <TrendingUp className="h-4 w-4" />
        ) : (
            <TrendingDown className="h-4 w-4" />
        )
    }

    const getTrendColor = () => {
        if (!trend || trend.value === 0) return 'text-muted-foreground'
        return trend.isPositive ? 'text-green-600' : 'text-red-600'
    }

    return (
        <Card className={cn('transition-all hover:shadow-lg', className)}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                    {title}
                </CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{value}</div>
                {trend && (
                    <div className={cn('flex items-center gap-1 text-xs', getTrendColor())}>
                        {getTrendIcon()}
                        <span>
                            {trend.value > 0 && '+'}
                            {trend.value}%
                        </span>
                        <span className="text-muted-foreground">vs mes anterior</span>
                    </div>
                )}
                {description && (
                    <p className="mt-1 text-xs text-muted-foreground">{description}</p>
                )}
            </CardContent>
        </Card>
    )
}
