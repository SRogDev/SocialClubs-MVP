"use client"

import { Button } from "@/components/ui/button"
import { ArrowLeft, Settings, Info } from "lucide-react"
import { useRouter } from "next/navigation"
import AvatarWithBadge from "@/ui/avatar-with-badge"
import type { Club } from "@/types/club"

interface ClubHeaderProps {
  club: Club
}

export default function ClubHeader({ club }: ClubHeaderProps) {
  const router = useRouter()

  return (
    <div className="sticky top-0 z-30 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => router.back()}>
            <ArrowLeft size={20} />
          </Button>

          <AvatarWithBadge
            src={club.imageUrl}
            alt={club.name}
            fallback={club.name.substring(0, 2).toUpperCase()}
            level={club.level}
            color={club.color}
            size="md"
          />

          <div>
            <h1 className="font-semibold text-lg">{club.name}</h1>
            <p className="text-xs text-muted-foreground">{club.members.toLocaleString()} miembros</p>
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

          {club.isCreator && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => router.push(`/club-edit?id=${club.id}`)}
            >
              <Settings size={18} />
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
