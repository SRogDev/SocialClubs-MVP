"use client"

import { Layout, Users, Zap, Calendar, Joystick, BarChart2, Megaphone } from "lucide-react"
import type React from "react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type SidebarProps = {
  /** currently selected tab */
  activeTab: string
  /** callback to change tab */
  onTabChange: (value: string) => void
  /** club name for the header */
  clubName: string
}

/**
 * Vertical sidebar used in the club edit screen.
 * Renders a list of navigation buttons.  The active one
 * is highlighted.  No external NavItem helper required.
 */
export default function ClubSidebar({ activeTab, onTabChange, clubName }: SidebarProps) {
  const items: { value: string; label: string; icon: React.ElementType }[] = [
    { value: "general", label: "General", icon: Layout },
    { value: "miembros", label: "Miembros", icon: Users },
    { value: "automatizar", label: "Automatizar", icon: Zap },
    { value: "agenda", label: "Agenda", icon: Calendar },
    { value: "gamificacion", label: "Gamificación", icon: Joystick },
    { value: "analiticas", label: "Analíticas", icon: BarChart2 },
    { value: "marketing", label: "Marketing", icon: Megaphone },
  ]

  return (
    <aside className="flex h-full w-64 flex-col border-r bg-background">
      <div className="px-4 py-6 text-lg font-semibold">{clubName}</div>

      <nav className="flex flex-1 flex-col gap-1 px-2 pb-4">
        {items.map(({ value, label, icon: Icon }) => (
          <Button
            key={value}
            variant="ghost"
            className={cn("justify-start gap-2", activeTab === value && "bg-muted hover:bg-muted")}
            onClick={() => onTabChange(value)}
            aria-current={activeTab === value ? "page" : undefined}
          >
            <Icon size={18} />
            {label}
          </Button>
        ))}
      </nav>
    </aside>
  )
}
