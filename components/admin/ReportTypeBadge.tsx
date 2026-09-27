'use client'

import { AlertCircle, Skull, DollarSign, Mail } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

type ReportType = 'sexual_content' | 'extreme_violence' | 'scam' | 'spam'

interface ReportTypeBadgeProps {
    type: ReportType
    count: number
    className?: string
}

export function ReportTypeBadge({ type, count, className }: ReportTypeBadgeProps) {
    const config = {
        sexual_content: {
            icon: AlertCircle,
            label: 'Contenido Sexual',
            className: 'bg-red-100 text-red-800 border-red-200',
        },
        extreme_violence: {
            icon: Skull,
            label: 'Violencia Extrema',
            className: 'bg-red-900/10 text-red-900 border-red-900/20',
        },
        scam: {
            icon: DollarSign,
            label: 'Estafa',
            className: 'bg-amber-100 text-amber-800 border-amber-200',
        },
        spam: {
            icon: Mail,
            label: 'Spam',
            className: 'bg-slate-100 text-slate-700 border-slate-200',
        },
    }

    const { icon: Icon, label, className: badgeClassName } = config[type]

    if (count === 0) return null

    return (
        <Badge
            variant="outline"
            className={cn('flex items-center gap-1.5 font-medium', badgeClassName, className)}
        >
            <Icon className="h-3.5 w-3.5" />
            <span>{label}</span>
            <span className="ml-1 rounded-full bg-current/20 px-1.5 py-0.5 text-xs font-bold">
                {count}
            </span>
        </Badge>
    )
}

interface ReportsSummaryProps {
    reports: {
        sexual_content: number
        extreme_violence: number
        scam: number
        spam: number
    }
    className?: string
}

export function ReportsSummary({ reports, className }: ReportsSummaryProps) {
    const types: ReportType[] = ['sexual_content', 'extreme_violence', 'scam', 'spam']

    return (
        <div className={cn('flex flex-wrap gap-2', className)}>
            {types.map((type) => (
                <ReportTypeBadge key={type} type={type} count={reports[type]} />
            ))}
        </div>
    )
}
