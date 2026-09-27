'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { Bell, BellOff, CheckCheck, Loader2 } from 'lucide-react'
import { useCallback, useOptimistic, useTransition } from 'react'

import { markAllNotificationsReadAction } from '@/app/actions/notificationActions'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useNotifications } from '@/hooks/swr/useNotifications'
import type { Notification } from '@/types/notification'

import { NotificationItem } from './NotificationItem'

/**
 * Centro de notificaciones completo.
 * Renderiza la lista paginada con infinite scroll, empty state, y "marcar todas como leídas".
 */
export function NotificationCenter() {
    const {
        notifications,
        unreadCount,
        hasMore,
        isLoading,
        isLoadingMore,
        loadMore,
        mutate,
    } = useNotifications()

    const [isPending, startTransition] = useTransition()

    // Optimistic state for hiding deleted / marking read
    const [optimisticNotifications, setOptimistic] = useOptimistic(
        notifications,
        (current: Notification[], action: { type: 'read' | 'delete'; id: string }) => {
            if (action.type === 'read') {
                return current.map((n) =>
                    n.id === action.id ? { ...n, read: true } : n
                )
            }
            if (action.type === 'delete') {
                return current.filter((n) => n.id !== action.id)
            }
            return current
        }
    )

    const handleOptimisticRead = useCallback(
        (id: string) => {
            startTransition(() => {
                setOptimistic({ type: 'read', id })
            })
        },
        [setOptimistic]
    )

    const handleOptimisticDelete = useCallback(
        (id: string) => {
            startTransition(() => {
                setOptimistic({ type: 'delete', id })
            })
        },
        [setOptimistic]
    )

    const handleMarkAllRead = useCallback(() => {
        startTransition(async () => {
            await markAllNotificationsReadAction()
            mutate()
        })
    }, [mutate])

    // Loading skeleton
    if (isLoading) {
        return (
            <div className="space-y-0">
                {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="flex items-start gap-3 px-4 py-3 animate-pulse">
                        <div className="w-8 h-8 rounded-lg bg-muted" />
                        <div className="flex-1 space-y-2">
                            <div className="h-3.5 bg-muted rounded w-3/4" />
                            <div className="h-3 bg-muted rounded w-1/2" />
                        </div>
                    </div>
                ))}
            </div>
        )
    }

    // Empty state
    if (optimisticNotifications.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="p-5 rounded-2xl bg-muted/40 mb-5"
                >
                    <BellOff size={32} className="text-muted-foreground/50" />
                </motion.div>
                <h3 className="font-semibold text-foreground mb-1">Sin notificaciones</h3>
                <p className="text-sm text-muted-foreground max-w-xs">
                    Cuando haya actividad en tus clubs, las notificaciones aparecerán aquí.
                </p>
            </div>
        )
    }

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
                <div className="flex items-center gap-2">
                    <Bell size={18} className="text-primary" />
                    <h2 className="font-semibold text-lg">Notificaciones</h2>
                    {unreadCount > 0 && (
                        <span className="flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-primary text-white text-xs font-bold">
                            {unreadCount > 99 ? '99+' : unreadCount}
                        </span>
                    )}
                </div>
                {unreadCount > 0 && (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleMarkAllRead}
                        disabled={isPending}
                        className="text-xs text-muted-foreground hover:text-foreground gap-1.5"
                    >
                        <CheckCheck size={14} />
                        Marcar todas
                    </Button>
                )}
            </div>

            {/* List */}
            <ScrollArea className="flex-1">
                <div className="divide-y divide-border/30">
                    <AnimatePresence mode="popLayout">
                        {optimisticNotifications.map((notification) => (
                            <NotificationItem
                                key={notification.id}
                                notification={notification}
                                onOptimisticRead={handleOptimisticRead}
                                onOptimisticDelete={handleOptimisticDelete}
                            />
                        ))}
                    </AnimatePresence>
                </div>

                {/* Load more */}
                {hasMore && (
                    <div className="flex justify-center py-4">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={loadMore}
                            disabled={isLoadingMore}
                            className="text-xs text-muted-foreground"
                        >
                            {isLoadingMore ? (
                                <Loader2 size={14} className="animate-spin mr-1.5" />
                            ) : null}
                            {isLoadingMore ? 'Cargando...' : 'Cargar más'}
                        </Button>
                    </div>
                )}
            </ScrollArea>
        </div>
    )
}
