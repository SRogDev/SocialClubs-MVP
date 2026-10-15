import { Layout, Users, Zap, Calendar, Joystick, BarChart2, Megaphone, HeadphonesIcon, Inbox, Settings2 } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type SidebarProps = {
    /** current club ID for navigation */
    clubId: string
    /** currently active section from URL */
    activeSection?: string
    /** club name for the header */
    clubName: string
    /** pending AI Inbox drafts — badge shown when > 0 */
    pendingCount?: number
}

/**
 * Vertical sidebar for club panel navigation.
 * Server Component that uses Link for navigation.
 */
export default function ClubPanelSidebar({ clubId, activeSection, clubName, pendingCount }: SidebarProps) {
    const items: { value: string; label: string; icon: LucideIcon; badge?: number }[] = [
        { value: "general", label: "General", icon: Layout },
        { value: "miembros", label: "Miembros", icon: Users },
        { value: "automatizar", label: "Automatizar", icon: Zap },
        { value: "ai-inbox", label: "Bandeja IA", icon: Inbox, badge: pendingCount },
        { value: "ai-config", label: "Config. IA", icon: Settings2 },
        { value: "agenda", label: "Agenda", icon: Calendar },
        { value: "gamificacion", label: "Gamificación", icon: Joystick },
        { value: "analiticas", label: "Analíticas", icon: BarChart2 },
        { value: "marketing", label: "Marketing", icon: Megaphone },
        { value: "support", label: "Soporte", icon: HeadphonesIcon },
    ]

    return (
        <aside className="flex h-full w-64 flex-col border-r bg-background">
            <div className="px-4 py-6 text-lg font-semibold">{clubName}</div>

            <nav className="flex flex-1 flex-col gap-1 px-2 pb-4">
                {items.map(({ value, label, icon: Icon, badge }) => {
                    const isActive = activeSection === value
                    return (
                        <Button
                            key={value}
                            variant="ghost"
                            className={cn("justify-start gap-2", isActive && "bg-muted hover:bg-muted")}
                            asChild
                        >
                            <Link href={`/clubs/${clubId}/panel/${value}`} aria-current={isActive ? "page" : undefined}>
                                <Icon size={18} />
                                <span className="flex-1 text-left">{label}</span>
                                {typeof badge === "number" && badge > 0 && (
                                    <span className="ml-auto rounded-full bg-primary px-2 py-0.5 text-xs font-semibold text-primary-foreground">
                                        {badge > 99 ? "99+" : badge}
                                    </span>
                                )}
                            </Link>
                        </Button>
                    )
                })}
            </nav>
        </aside>
    )
}
