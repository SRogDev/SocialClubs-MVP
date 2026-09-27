"use client"

import { Copy, Share2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import { type Club } from "@/types/club"

type InviteLinkCardProps = {
    club: Club
    color: string
}

export default function InviteLinkCard({ club, color }: InviteLinkCardProps) {
    const { toast } = useToast()
    const inviteLink = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://socialclubs.com'}/clubs/join/${club.club_link}`

    const copyInviteLink = () => {
        navigator.clipboard.writeText(inviteLink)
        toast({
            title: "¡Enlace copiado!",
            description: "El enlace de invitación se ha copiado al portapapeles.",
        })
    }

    const shareInviteLink = async () => {
        if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
            try {
                await navigator.share({
                    title: `Únete a ${club.name}`,
                    text: `Te invito a unirte a mi club "${club.name}" en SocialClubs`,
                    url: inviteLink,
                })
            } catch (error) {
                // User cancelled share or error occurred
                console.log('Error sharing:', error)
            }
        } else {
            // Fallback to copy
            copyInviteLink()
        }
    }

    return (
        <Card
            className="shadow-sm hover:shadow-md transition-all duration-300"
            style={{ borderColor: `${color}40` }}
        >
            <CardContent className="pt-6">
                <h2 className="text-lg font-serif font-semibold mb-3" style={{ color }}>
                    Enlace de invitación
                </h2>
                <div className="flex items-center gap-2 p-3 bg-muted/30 rounded-lg">
                    <Input value={inviteLink} readOnly className="flex-1 text-sm" />
                    <Button variant="outline" size="sm" onClick={copyInviteLink}>
                        <Copy size={16} />
                    </Button>
                    {typeof navigator !== "undefined" && typeof navigator.share === "function" && (
                        <Button variant="outline" size="sm" onClick={shareInviteLink}>
                            <Share2 size={16} />
                        </Button>
                    )}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                    Comparte este enlace para invitar a otros a unirse al club
                </p>
            </CardContent>
        </Card>
    )
}
