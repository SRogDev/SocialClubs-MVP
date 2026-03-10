'use client'

import { useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  AnimatePresence,
} from 'framer-motion'
import { Home, Compass, User, Bell, LayoutDashboard } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useUnreadNotificationCount } from '@/hooks/swr/useNotifications'

const NAV_ITEMS = [
  { href: '/clubs', icon: Home, label: 'Inicio' },
  { href: '/explore', icon: Compass, label: 'Explorar' },
  { href: '/notifications', icon: Bell, label: 'Notificaciones', showBadge: true },
  { href: '/panel', icon: LayoutDashboard, label: 'Panel' },
  { href: '/profile', icon: User, label: 'Perfil' },
]

function DockItem({
  href,
  icon: Icon,
  label,
  isActive,
  mouseX,
  badge,
}: {
  href: string
  icon: React.ElementType
  label: string
  isActive: boolean
  mouseX: ReturnType<typeof useMotionValue<number>>
  badge?: number
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [tooltip, setTooltip] = useState(false)

  // Distance from cursor → scale spring
  const distance = useTransform(mouseX, (val) => {
    const bounds = ref.current?.getBoundingClientRect()
    if (!bounds) return 999
    return Math.abs(val - (bounds.left + bounds.width / 2))
  })

  const widthSync = useTransform(distance, [-1, 0, 80, 160], [52, 60, 52, 44])
  const width = useSpring(widthSync, { mass: 0.1, stiffness: 180, damping: 15 })

  return (
    <Link href={href}>
      <motion.div
        ref={ref}
        style={{ width, height: width }}
        onMouseEnter={() => setTooltip(true)}
        onMouseLeave={() => setTooltip(false)}
        className={cn(
          'relative flex items-center justify-center rounded-2xl transition-colors duration-200 cursor-pointer',
          isActive
            ? 'bg-primary text-white shadow-[0_0_18px_4px_hsl(20_100%_50%/0.4)]'
            : 'bg-background/80 dark:bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
        )}
      >
        <Icon size={20} />

        {/* Active dot */}
        {isActive && (
          <motion.div
            layoutId="active-dot"
            className="absolute -bottom-1.5 w-1.5 h-1.5 rounded-full bg-primary"
          />
        )}

        {/* Tooltip */}
        <AnimatePresence>
          {tooltip && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              transition={{ duration: 0.15 }}
              className="absolute -top-9 left-1/2 -translate-x-1/2 bg-foreground text-background
                         text-xs px-2 py-1 rounded-lg whitespace-nowrap pointer-events-none shadow-lg"
            >
              {label}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </Link>
  )
}

export function FloatingDock({ className }: { className?: string }) {
  const pathname = usePathname()
  const mouseX = useMotionValue(Infinity)
  const { count: unreadCount } = useUnreadNotificationCount()

  return (
    <motion.nav
      data-bottom-nav
      role="navigation"
      aria-label="Navegación principal"
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 260, damping: 28, delay: 0.3 }}
      className={cn(
        'fixed bottom-5 left-1/2 -translate-x-1/2 z-50',
        className
      )}
    >
      <motion.div
        onMouseMove={(e) => mouseX.set(e.clientX)}
        onMouseLeave={() => mouseX.set(Infinity)}
        className="flex items-end gap-2.5 px-4 py-3 rounded-[28px]
                   bg-background/70 dark:bg-card/70 backdrop-blur-xl
                   border border-border/60 shadow-2xl"
        style={{
          boxShadow:
            '0 8px 32px hsl(20 100% 50% / 0.12), 0 2px 8px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.1)',
        }}
      >
        {NAV_ITEMS.map((item) => (
          <DockItem
            key={item.href}
            href={item.href}
            icon={item.icon}
            label={item.label}
            isActive={pathname.startsWith(item.href)}
            mouseX={mouseX}
            badge={item.showBadge ? unreadCount : undefined}
          />
        ))}
      </motion.div>
    </motion.nav>
  )
}
