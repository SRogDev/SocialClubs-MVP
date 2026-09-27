'use client'

import { motion } from 'framer-motion'
import { Home, Compass, Bell, User, Zap, LayoutDashboard } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { useUnreadNotificationCount } from '@/hooks/swr/useNotifications'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
    { href: '/clubs', icon: Home, label: 'Inicio' },
    { href: '/explore', icon: Compass, label: 'Explorar' },
    { href: '/notifications', icon: Bell, label: 'Notificaciones', showBadge: true },
    { href: '/panel', icon: LayoutDashboard, label: 'Panel' },
    { href: '/profile', icon: User, label: 'Perfil' },
]

export function DesktopSidebar() {
    const pathname = usePathname()
    const { count: unreadCount } = useUnreadNotificationCount()

    return (
        <aside
            role="navigation"
            aria-label="Navegación principal"
            className="hidden md:flex fixed left-0 top-0 h-full w-[220px] z-40 flex-col
                 bg-background/80 backdrop-blur-xl border-r border-border/60
                 shadow-[1px_0_20px_hsl(20_100%_50%/0.05)]"
        >
            {/* Logo */}
            <div className="flex items-center gap-2.5 px-5 py-5 border-b border-border/40">
                <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center shadow-[0_0_14px_hsl(20_100%_50%/0.5)]">
                    <Zap size={16} className="text-white" />
                </div>
                <span className="font-bold text-lg tracking-tight">SocialClubs</span>
            </div>

            {/* Nav items */}
            <nav className="flex-1 px-3 py-4 space-y-1">
                {NAV_ITEMS.map((item) => {
                    const isActive =
                        item.href === '/clubs'
                            ? pathname === '/clubs' || pathname.startsWith('/clubs/')
                            : pathname === item.href || pathname.startsWith(`${item.href  }/`)

                    return (
                        <Link key={item.href} href={item.href}>
                            <motion.div
                                whileHover={{ x: 3 }}
                                whileTap={{ scale: 0.97 }}
                                className={cn(
                                    'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer group',
                                    isActive
                                        ? 'bg-primary/10 text-primary shadow-[0_0_12px_hsl(20_100%_50%/0.15)]'
                                        : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
                                )}
                            >
                                <item.icon
                                    size={18}
                                    className={cn(
                                        'flex-shrink-0 transition-colors',
                                        isActive ? 'text-primary' : 'group-hover:text-foreground'
                                    )}
                                />
                                <span>{item.label}</span>

                                {/* Unread badge for notifications */}
                                {item.showBadge && unreadCount > 0 && (
                                    <span className="ml-auto flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold leading-none">
                                        {unreadCount > 99 ? '99+' : unreadCount}
                                    </span>
                                )}

                                {/* Active indicator line */}
                                {isActive && !(item.showBadge && unreadCount > 0) && (
                                    <motion.div
                                        layoutId="sidebar-active"
                                        className="ml-auto w-1.5 h-1.5 rounded-full bg-primary"
                                    />
                                )}
                            </motion.div>
                        </Link>
                    )
                })}
            </nav>

            {/* Bottom glow accent */}
            <div
                className="absolute bottom-0 left-0 right-0 h-32 pointer-events-none"
                style={{
                    background:
                        'linear-gradient(to top, hsl(20 100% 50% / 0.04), transparent)',
                }}
                aria-hidden
            />
        </aside>
    )
}
