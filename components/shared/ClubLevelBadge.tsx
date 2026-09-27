'use client'

import { Crown, Shield } from 'lucide-react'

import { cn } from '@/lib/utils'

interface ClubLevelBadgeProps {
    level: number
    color?: string
    size?: 'xs' | 'sm' | 'md' | 'lg'
    className?: string
}

const sizeConfig = {
    xs: { badge: 'h-4 min-w-[16px] px-1 text-[10px]', icon: 8 },
    sm: { badge: 'h-5 min-w-[20px] px-1.5 text-xs', icon: 10 },
    md: { badge: 'h-6 min-w-[24px] px-2 text-xs', icon: 12 },
    lg: { badge: 'h-7 min-w-[28px] px-2.5 text-sm', icon: 14 },
}

/**
 * Badge unificado para mostrar el nivel de un club.
 * Se muestra junto al avatar/icono del club en toda la app.
 *
 * - Nivel 10+: Badge dorado con corona
 * - Nivel 5-9:  Badge azul con escudo
 * - Nivel 1-4:  Badge con el color del club
 */
export function ClubLevelBadge({
    level,
    color = '#f97316',
    size = 'sm',
    className,
}: ClubLevelBadgeProps) {
    const { badge: badgeCls, icon: iconSize } = sizeConfig[size]

    // Tier visual
    const isGold = level >= 10
    const isBlue = level >= 5 && level < 10

    const bgColor = isGold
        ? 'bg-gradient-to-r from-yellow-400 to-yellow-600'
        : isBlue
            ? 'bg-gradient-to-r from-blue-400 to-blue-600'
            : ''

    const bgStyle = !isGold && !isBlue ? { backgroundColor: color } : undefined

    const TierIcon = isGold ? Crown : isBlue ? Shield : null

    return (
        <span
            className={cn(
                'inline-flex items-center justify-center gap-0.5 rounded-full font-bold text-white shadow-lg leading-none',
                badgeCls,
                bgColor,
                className
            )}
            style={bgStyle}
            title={`Nivel ${level}`}
        >
            {TierIcon && <TierIcon size={iconSize} className="flex-shrink-0" />}
            {level}
        </span>
    )
}
