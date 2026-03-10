"use client"

import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { ArrowLeft, Settings, Info } from "lucide-react"
import { useRouter } from "next/navigation"
import { ClubLevelBadge } from "@/components/shared/ClubLevelBadge"
import type { Club } from "@/types/club"

interface ClubHeaderProps {
  club: Club
}

export default function ClubHeader({ club }: ClubHeaderProps) {
  const router = useRouter()
  const clubColor = club.color || '#f97316'
  const clubName = club.name || 'Club'

  return (
    <div className="sticky top-0 z-30 bg-background/85 backdrop-blur-xl border-b border-border/50">
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => router.back()}>
            <ArrowLeft size={20} />
          </Button>

          <div className="relative">
            <Avatar className="h-10 w-10 ring-2 ring-border">
              <AvatarFallback style={{ backgroundColor: `${clubColor}20`, color: clubColor }}>
                {clubName.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="absolute -bottom-1 -right-1">
              <ClubLevelBadge level={club.level ?? 1} color={clubColor} size="xs" />
            </div>
          </div>

          <div>
            <h1 className="font-semibold text-lg">{clubName}</h1>
            <p className="text-xs text-muted-foreground">{(club.total_members ?? 0).toLocaleString()} miembros</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => router.push(`/club-info?id=${club.id}`)}
          >
            <Info size={18} />
          </Button>
        </div>
      </div>
    </div>
  )
}
