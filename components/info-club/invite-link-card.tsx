"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Copy } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

type InviteLinkCardProps = {
    clubId: string
    color: string
}

export default function InviteLinkCard({ clubId, color }: InviteLinkCardProps) {
    const { toast } = useToast()
    const inviteLink = `https://socialclubs.com/invite/${clubId}`

    const copyInviteLink = () => {
        navigator.clipboard.writeText(inviteLink)
        toast({
            title: "¡Enlace copiado!",
            description: "El enlace de invitación se ha copiado al portapapeles.",
        })
    }

    return (
        <GlassCard
            className="shadow-sm hover:shadow-md transition-all duration-300"
            color={color}
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
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                    Comparte este enlace para invitar a otros a unirse al club
                </p>
            </CardContent>
        </Card>
