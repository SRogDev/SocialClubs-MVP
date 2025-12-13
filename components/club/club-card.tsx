import Link from "next/link"
import { ImageIcon, Video, MessageSquare } from "lucide-react"
import AvatarWithBadge from "@/ui/avatar-with-badge"
import type { Club } from "@/types/club"

interface ClubCardProps {
  club: Club
}

export default function ClubCard({ club }: ClubCardProps) {
  const getContentIcon = () => {
    if (!club.lastContent) return <MessageSquare size={14} />

    switch (club.lastContent.type) {
      case "image":
        return <ImageIcon size={14} />
      case "video":
        return <Video size={14} />
      default:
        return <MessageSquare size={14} />
    }
  }

  return (
    <Link href={`/club?id=${club.id}`} className="block">
      <div
        className="flex items-center justify-between p-4 hover:bg-accent/30 rounded-xl transition-all duration-300 hover:shadow-md hover:translate-y-[-1px] bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700"
        style={{ borderLeft: `4px solid ${club.color}` }}
      >
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <AvatarWithBadge
            src={club.imageUrl}
            alt={`Avatar de ${club.name}`}
            fallback={club.name.substring(0, 2).toUpperCase()}
            level={club.level}
            color={club.color}
            size="md"
          />

          <div className="flex flex-col flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-gray-900 dark:text-white truncate">{club.name}</h3>
            </div>

            {club.lastContent && (
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <div style={{ color: club.color }}>{getContentIcon()}</div>
                <span className="truncate flex-1">{club.lastContent.preview}</span>
                <span className="text-xs text-gray-400 flex-shrink-0">{club.lastContent.time}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </Link>
  )
}
