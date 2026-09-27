"use client"

import { Eye, UserPlus, Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"

import { joinClubAction } from "@/app/actions/clubActions"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { vibrate, VibrationPatterns } from "@/utils/pwa"

type ClubVisitorCTAProps = {
    clubId: string
    clubName: string
    clubColor: string
    /** club_link code (used to build the invite-aware sign-up URL) */
    inviteCode: string | null
    /** authenticated user id, null if not logged in */
    userId: string | null
}

/**
 * Shown on the info page for visitors (non-members).
 * "Ver Club"  → enters visitor mode without auth
 * "Unirse"    → auto-joins if authenticated, redirects to sign-up otherwise
 */
export default function ClubVisitorCTA({
    clubId,
    clubName,
    clubColor,
    inviteCode,
    userId,
}: ClubVisitorCTAProps) {
    const router = useRouter()
    const { toast } = useToast()
    const [joining, setJoining] = useState(false)

    const handleJoin = async () => {
        if (!userId) {
            // Not authenticated — send to sign-up preserving the invite code so
            // emailRedirectTo will auto-join the club after email confirmation.
            const inviteParam = inviteCode ?? ""
            router.push(
                `/auth/sign-up?invite=${inviteParam}&clubId=${clubId}&club=${encodeURIComponent(clubName)}`,
            )
            return
        }

        setJoining(true)
        vibrate(Array.from(VibrationPatterns.click))

        const result = await joinClubAction(clubId)

        if (result.success) {
            vibrate(Array.from(VibrationPatterns.success))
            toast({ title: `¡Bienvenido a ${clubName}!`, description: "Ya eres miembro." })
            router.push(`/clubs/${clubId}?joined=true`)
        } else {
            vibrate(Array.from(VibrationPatterns.error))
            toast({
                title: "Error al unirse",
                description: result.error ?? "Inténtalo de nuevo.",
                variant: "destructive",
            })
            setJoining(false)
        }
    }

    return (
        <div
            className="flex flex-col sm:flex-row gap-3 p-4 rounded-2xl border"
            style={{ borderColor: `${clubColor}33`, background: `${clubColor}08` }}
        >
            <Button
                variant="outline"
                className="flex-1 gap-2 font-medium"
                onClick={() => router.push(`/clubs/${clubId}`)}
            >
                <Eye size={16} />
                Ver Club
            </Button>

            <Button
                className="flex-1 gap-2 font-semibold text-white"
                style={{ background: `linear-gradient(135deg, ${clubColor} 0%, ${clubColor}cc 100%)` }}
                onClick={handleJoin}
                disabled={joining}
            >
                {joining ? (
                    <Loader2 size={16} className="animate-spin" />
                ) : (
                    <UserPlus size={16} />
                )}
                {joining ? "Uniéndote…" : "Unirse al club"}
            </Button>
        </div>
    )
}
