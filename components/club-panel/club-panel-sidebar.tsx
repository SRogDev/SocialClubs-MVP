import Link from "next/link"
import { cn } from "@/lib/utils"
import { Layout, Users, Zap, Calendar, Joystick, BarChart2, Megaphone, HeadphonesIcon } from "lucide-react"
import { Button } from "@/components/ui/button"

type SidebarProps = {
    /** current club ID for navigation */
    clubId: string
    /** currently active section from URL */
    activeSection?: string
    /** club name for the header */
    clubName: string
}

/**
 * Vertical sidebar for club panel navigation.
 * Server Component that uses Link for navigation.
 */
export default function ClubPanelSidebar({ clubId, activeSection, clubName }: SidebarProps) {
    const items: { value: string; label: string; icon: React.ElementType }[] = [
        { value: "general", label: "General", icon: Layout },
        { value: "miembros", label: "Miembros", icon: Users },
        { value: "automatizar", label: "Automatizar", icon: Zap },
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
                {items.map(({ value, label, icon: Icon }) => {
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
                                {label}
                            </Link>
                        </Button>
                    )
                })}
            </nav>
        </aside>
    )
}
