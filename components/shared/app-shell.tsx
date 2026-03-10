'use client'

import { usePathname } from 'next/navigation'
import { FloatingDock } from './floating-dock'
import { DesktopSidebar } from './desktop-sidebar'
import { LevelUpCelebration } from '@/components/notifications/LevelUpCelebration'
import { useClubLevelListener } from '@/hooks/use-club-level-listener'
import { useCurrentUser } from '@/hooks/swr'

// Routes where the navigation (dock + sidebar) should NOT appear
const HIDDEN_NAV_ROUTES = ['/', '/auth', '/landing', '/videocall', '/admin']

/**
 * AppShell – wraps authenticated content with navigation.
 * - Mobile: FloatingDock at the bottom
 * - Desktop (md+): DesktopSidebar on the left, content shifted right
 * - Level-up celebrations are shown globally
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { user: userData } = useCurrentUser()
  const userId = userData?.id ?? null
  const { levelUpData, dismiss } = useClubLevelListener(userId)

  const hideNav = HIDDEN_NAV_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(route + '/')
  )

  if (hideNav) {
    return <>{children}</>
  }

  return (
    <>
      {/* Desktop sidebar — hidden on mobile */}
      <DesktopSidebar />

      {/* Main content — shifted right on desktop to account for sidebar */}
      <div id="main-content" className="md:ml-[220px]">
        {children}
      </div>

      {/* Mobile bottom dock — hidden on desktop */}
      <div className="md:hidden">
        <FloatingDock />
      </div>

      {/* Global level-up celebration overlay */}
      <LevelUpCelebration data={levelUpData} onDismiss={dismiss} />
    </>
  )
}
