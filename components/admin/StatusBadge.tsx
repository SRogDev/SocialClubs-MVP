'use client'

import { CheckCircle, Ban, AlertTriangle } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface StatusBadgeProps {
    status: 'active' | 'banned' | 'suspended'
    className?: string
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
    const config = {
        active: {
            icon: CheckCircle,
            label: 'Activo',
            variant: 'default' as const,
            className: 'bg-green-100 text-green-800 hover:bg-green-100',
        },
        banned: {
            icon: Ban,
            label: 'Baneado',
            variant: 'destructive' as const,
            className: 'bg-red-100 text-red-800 hover:bg-red-100',
        },
        suspended: {
            icon: AlertTriangle,
            label: 'Suspendido',
            variant: 'secondary' as const,
            className: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100',
        },
    }

    const { icon: Icon, label, variant, className: badgeClassName } = config[status]

    return (
        <Badge
            variant={variant}
            className={cn('flex items-center gap-1', badgeClassName, className)}
        >
            <Icon className="h-3 w-3" />
            {label}
        </Badge>
    )
}
