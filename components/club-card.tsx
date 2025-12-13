import Link from "next/link"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Shield, Crown, ImageIcon, Video, MessageSquare } from "lucide-react"
import Image from "next/image"

interface ClubCardProps {
  id?: string
  name?: string
  imageUrl?: string
  hasNewMessages?: boolean
  color?: string
  club?: any
}

export default function ClubCard({
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

  const getVerificationBadge = () => {
    if (clubLevel >= 10) {
      return (
        <div className="absolute -top-1 -right-1 bg-gradient-to-r from-yellow-400 to-yellow-600 rounded-full p-1 shadow-lg">
          <Crown size={12} className="text-white" />
        </div>
      )
    } else if (clubLevel >= 5) {
      return (
        <div className="absolute -top-1 -right-1 bg-gradient-to-r from-blue-400 to-blue-600 rounded-full p-1 shadow-lg">
          <Shield size={12} className="text-white" />
        </div>
      )
    }
    return null
  }

  const getContentIcon = () => {
    if (!lastContent) return <MessageSquare size={14} />

    switch (lastContent.type) {
      case "image":
        return <ImageIcon size={14} />
      case "video":
        return <Video size={14} />
      default:
        return <MessageSquare size={14} />
    }
  }

  return (
    <Link href={`/clubs/${clubId}`} className="block">
      <div
        className="flex items-center justify-between p-4 hover:bg-accent/30 rounded-xl transition-all duration-300 hover:shadow-md hover:translate-y-[-1px] bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700"
        style={{ borderLeft: `4px solid ${clubColor}` }}
      >
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <div className="relative flex-shrink-0">
            <Avatar className="h-14 w-14 hover:scale-105 transition-transform ring-2 ring-gray-100 dark:ring-gray-700">
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

            {getVerificationBadge()}

            {/* Nivel del club */}
            <div className="absolute -bottom-1 -right-1">
              <Badge
                className="h-5 px-1.5 text-xs font-bold shadow-lg"
                style={{
                  backgroundColor: clubColor,
                  color: "white",
                }}
              >
                {clubLevel}
              </Badge>
            </div>
          </div>

          <div className="flex flex-col flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-gray-900 dark:text-white truncate">{clubName}</h3>
            </div>

            {lastContent && (
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <div style={{ color: clubColor }}>{getContentIcon()}</div>
                <span className="truncate flex-1">{lastContent.preview}</span>
                <span className="text-xs text-gray-400 flex-shrink-0">{lastContent.time}</span>
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
    </Link>
  )
}
