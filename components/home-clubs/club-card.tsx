'use client'

import { Image } from '@imagekit/next'
import { ImageIcon, Video, MessageSquare } from 'lucide-react'
import Link from 'next/link'
import { memo } from 'react'

import { ClubLevelBadge } from '@/components/shared/ClubLevelBadge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Card3D } from '@/components/ui/card-3d'

interface ClubCardProps {
  id?: string
  name?: string
  imageUrl?: string
  hasNewMessages?: boolean
  color?: string
  club?: any
}

function ClubCard({
  id,
  name,
  imageUrl,
  hasNewMessages = false,
  color = "#f97316",
  club,
}: ClubCardProps) {
  const clubId = id || club?.id || ""
  const clubName = name || club?.name || "Club"
  const clubImage = imageUrl || club?.image || "/placeholder.svg"
  const clubColor = color || club?.color || "#f97316"
  const clubLevel = club?.level || 1
  const lastContent = club?.lastContent

  const getContentIcon = () => {
    if (!lastContent) return <MessageSquare size={14} />
    switch (lastContent.type) {
      case "image": return <ImageIcon size={14} />
      case "video": return <Video size={14} />
      default: return <MessageSquare size={14} />
    }
  }

  return (
    <Link href={`/clubs/${clubId}`} className="block">
      <Card3D intensity={6} glow>
        <div
          className="flex items-center justify-between p-4 hover:bg-accent/30 rounded-xl
                     transition-all duration-300 bg-card border border-border"
          style={{ borderLeft: `4px solid ${clubColor}` }}
        >
          <div className="flex items-center gap-4 flex-1 min-w-0">
            <div className="relative flex-shrink-0">
              <Avatar className="h-14 w-14 ring-2 ring-border">
                <Image
                  src={clubImage || "/placeholder.svg"}
                  alt={`Avatar de ${clubName}`}
                  width={56}
                  height={56}
                  className="h-14 w-14 rounded-full object-cover"
                />
                <AvatarFallback style={{ backgroundColor: `${clubColor}20`, color: clubColor }}>
                  {clubName.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="absolute -bottom-1 -right-1">
                <ClubLevelBadge level={clubLevel} color={clubColor} size="xs" />
              </div>
            </div>

            <div className="flex flex-col flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-foreground truncate">{clubName}</h3>
              </div>
              {lastContent && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <div style={{ color: clubColor }}>{getContentIcon()}</div>
                  <span className="truncate flex-1">{lastContent.preview}</span>
                  <span className="text-xs text-muted-foreground/60 flex-shrink-0">{lastContent.time}</span>
                </div>
              )}
              {hasNewMessages && (
                <div className="mt-1">
                  <Badge className="bg-red-500 hover:bg-red-600 text-xs">Nuevo</Badge>
                </div>
              )}
            </div>
          </div>
        </div>
      </Card3D>
    </Link>
  )
}

export default memo(ClubCard)
