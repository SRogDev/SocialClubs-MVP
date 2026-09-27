'use client'

import { motion } from 'framer-motion'
import { Trash2 } from 'lucide-react'
import Link from 'next/link'
import { useCallback, useTransition } from 'react'

import { markNotificationReadAction, deleteNotificationAction } from '@/app/actions/notificationActions'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { Notification } from '@/types/notification'

interface NotificationItemProps {
    notification: Notification
    onOptimisticRead?: (id: string) => void
    onOptimisticDelete?: (id: string) => void
}

function timeAgo(dateStr: string): string {
    const now = Date.now()
    const date = new Date(dateStr).getTime()
    const diff = now - date

    const minutes = Math.floor(diff / 60_000)
    if (minutes < 1) return 'ahora'
    if (minutes < 60) return `${minutes}m`

    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}h`

    const days = Math.floor(hours / 24)
    if (days < 7) return `${days}d`

    const weeks = Math.floor(days / 7)
    if (weeks < 4) return `${weeks}sem`

    const months = Math.floor(days / 30)
    return `${months}mes`
}

/**
 * Componente presentacional de un item de notificación.
 * Marca como leída al hacer click, navega a action_url.
 */
export function NotificationItem({
    notification,
    onOptimisticRead,
    onOptimisticDelete,
}: NotificationItemProps) {
    const [isPending, startTransition] = useTransition()

    const handleClick = useCallback(() => {
        if (!notification.read) {
            onOptimisticRead?.(notification.id)
            startTransition(async () => {
                await markNotificationReadAction(notification.id)
            })
        }
    }, [notification.id, notification.read, onOptimisticRead])

    const handleDelete = useCallback(
        (e: React.MouseEvent) => {
            e.preventDefault()
            e.stopPropagation()
            onOptimisticDelete?.(notification.id)
            startTransition(async () => {
                await deleteNotificationAction(notification.id)
            })
        },
        [notification.id, onOptimisticDelete]
    )

    const content = (
        <motion.div
            layout
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.2 }}
            className={cn(
                'group flex items-start gap-3 px-4 py-3 transition-colors duration-150 cursor-pointer',
                'hover:bg-muted/50',
                !notification.read && 'bg-primary/[0.04]'
            )}
        >
            {/* Icon */}
            <div className="flex-shrink-0 mt-0.5 text-xl leading-none select-none">
                {notification.icon || '🔔'}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
                <p
                    className={cn(
                        'text-sm leading-snug',
                        !notification.read ? 'font-semibold text-foreground' : 'text-muted-foreground'
                    )}
                >
                    {notification.title}
                </p>
                {notification.body && (
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2 leading-relaxed">
                        {notification.body}
                    </p>
                )}
                <span className="text-[11px] text-muted-foreground/60 mt-1 block">
                    {timeAgo(notification.created_at)}
                </span>
            </div>

            {/* Right side: unread dot + delete */}
            <div className="flex items-center gap-1.5 flex-shrink-0 mt-1">
                {!notification.read && (
                    <span className="w-2 h-2 rounded-full bg-primary shadow-[0_0_6px_hsl(20_100%_50%/0.4)]" />
                )}
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                    onClick={handleDelete}
                    aria-label="Eliminar notificación"
                >
                    <Trash2 size={13} />
                </Button>
            </div>
        </motion.div>
    )

    if (notification.action_url) {
        return (
            <Link href={notification.action_url} onClick={handleClick} className="block">
                {content}
            </Link>
        )
    }

    return <div onClick={handleClick}>{content}</div>
}
