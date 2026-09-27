import { Crown, Shield } from "lucide-react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"

type ClubHeaderProps = {
    club: {
        name: string
        imageUrl: string
        color: string
        level: number
    }
}

export default function ClubHeader({ club }: ClubHeaderProps) {
    const getVerificationBadge = () => {
        if (club.level >= 10) {
            return (
                <div className="absolute -top-1 -right-1 bg-gradient-to-r from-yellow-400 to-yellow-600 rounded-full p-1 shadow-lg">
                    <Crown size={12} className="text-white" />
                </div>
            )
        } else if (club.level >= 5) {
            return (
                <div className="absolute -top-1 -right-1 bg-gradient-to-r from-blue-400 to-blue-600 rounded-full p-1 shadow-lg">
                    <Shield size={12} className="text-white" />
                </div>
            )
        }
        return null
    }

    return (
        <div className="flex flex-col items-center mb-6 relative text-center">
            <div className="relative mb-4">
                <Avatar
                    className="h-24 w-24 hover:scale-105 transition-transform ring-2"
                    style={{ ['--tw-ring-color' as any]: `${club.color}40` }}
                >
                    <AvatarImage src={club.imageUrl || "/placeholder.svg"} alt={club.name} />
                    <AvatarFallback style={{ backgroundColor: `${club.color}20`, color: club.color }}>
                        {club.name.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                </Avatar>

                {getVerificationBadge()}

                <div className="absolute -bottom-2 -right-2">
                    <Badge
                        className="h-6 px-2 text-xs font-bold shadow-lg"
                        style={{
                            backgroundColor: club.color,
                            color: "white",
                        }}
                    >
                        Nv.{club.level}
                    </Badge>
                </div>
            </div>

            <h1 className="text-2xl font-serif font-bold mb-2">{club.name}</h1>
        </div>
    )
}
