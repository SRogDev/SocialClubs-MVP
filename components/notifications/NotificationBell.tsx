'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { Bell } from 'lucide-react'
import Link from 'next/link'

import { useUnreadNotificationCount } from '@/hooks/swr/useNotifications'
import { cn } from '@/lib/utils'

interface NotificationBellProps {
    className?: string
}

/**
 * Campana de notificaciones con badge de conteo de no leídas.
 * Usada en la barra de navegación (mobile + desktop).
 */
export function NotificationBell({ className }: NotificationBellProps) {
    const { count } = useUnreadNotificationCount()

    return (
        <Link href="/notifications" className={cn('relative', className)}>
            <Bell size={18} />
            <AnimatePresence>
                {count > 0 && (
                    <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        exit={{ scale: 0 }}
                        className="absolute -top-1.5 -right-1.5 flex items-center justify-center
                                   min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white
                                   text-[10px] font-bold leading-none shadow-lg"
                    >
                        {count > 99 ? '99+' : count}
                    </motion.span>
                )}
            </AnimatePresence>
        </Link>
    )
}
