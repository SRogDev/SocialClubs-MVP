'use client'

import { motion, useMotionValue, useTransform, animate } from 'framer-motion'
import type { LucideIcon} from 'lucide-react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { useEffect, useRef } from 'react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { SpotlightCard } from '@/components/ui/spotlight'
import { cn } from '@/lib/utils'

interface MetricCardProps {
    title: string
    value: string | number
    icon: LucideIcon
    trend?: {
        value: number
        isPositive?: boolean
    }
    description?: string
    className?: string
    index?: number
}

function AnimatedNumber({ value }: { value: number }) {
    const motionVal = useMotionValue(0)
    const rounded = useTransform(motionVal, (v) => Math.round(v).toLocaleString())
    const hasAnimated = useRef(false)

    useEffect(() => {
        if (hasAnimated.current) return
        hasAnimated.current = true
        const controls = animate(motionVal, value, { duration: 1.5, ease: 'easeOut' })
        return controls.stop
    }, [value, motionVal])

    return <motion.span>{rounded}</motion.span>
}

function parseNumericValue(value: string | number): { prefix: string; number: number; suffix: string } | null {
    if (typeof value === 'number') return { prefix: '', number: value, suffix: '' }
    const match = String(value).match(/^([^0-9]*)([0-9,]+(?:\.[0-9]+)?)(.*)$/)
    if (!match) return null
    return {
        prefix: match[1],
        number: parseFloat(match[2].replace(/,/g, '')),
        suffix: match[3],
    }
}

export function MetricCard({
    title,
    value,
    icon: Icon,
    trend,
    description,
    className,
    index = 0,
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

    const parsed = parseNumericValue(value)

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: index * 0.06 }}
        >
            <SpotlightCard className={cn('h-full', className)}>
                <Card className="transition-all hover:shadow-lg border-border/60 hover:border-primary/20 h-full">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            {title}
                        </CardTitle>
                        <Icon className="h-4 w-4 text-primary/60" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {parsed ? (
                                <>
                                    {parsed.prefix}
                                    <AnimatedNumber value={parsed.number} />
                                    {parsed.suffix}
                                </>
                            ) : (
                                value
                            )}
                        </div>
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
            </SpotlightCard>
        </motion.div>
    )
}
