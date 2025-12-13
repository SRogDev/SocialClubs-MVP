"use client"

import { useState } from "react"
import { useToast } from "@/hooks/use-toast"
import ClubActions from "./club-actions"
import NotificationsToggle from "./notifications-toggle"
import TipDialog from "./tip-dialog"
import TipSuccessDialog from "./tip-success-dialog"

type ClubInteractiveWrapperProps = {
    clubName: string
    clubColor: string
    initialSocialCoins: number
}

export default function ClubInteractiveWrapper({
    clubName,
    clubColor,
    initialSocialCoins,
}: ClubInteractiveWrapperProps) {
    const [showTipDialog, setShowTipDialog] = useState(false)
    const [showSuccessDialog, setShowSuccessDialog] = useState(false)
    const [socialCoins, setSocialCoins] = useState(initialSocialCoins)
    const [lastTipAmount, setLastTipAmount] = useState(0)
    const [notificationsEnabled, setNotificationsEnabled] = useState(true)
    const { toast } = useToast()

    const handleSendTip = async (amount: number) => {
        // Simulación de envío de propina (reemplazar con lógica real)
        await new Promise((resolve) => setTimeout(resolve, 1500))

        // Verificar si el monto de la propina es válido
        if (amount > socialCoins) {
            toast({
                title: "Error",
                description: "No tienes suficientes SocialCoins para enviar esta propina.",
                variant: "destructive",
            })
            return
        }

        // Actualizar el estado de las SocialCoins
        setSocialCoins(socialCoins - amount)
        setLastTipAmount(amount)

        // Mostrar diálogo de éxito
        setShowSuccessDialog(true)
        setShowTipDialog(false)

        // Mostrar toast de éxito
        toast({
            title: "¡Propina enviada!",
            description: `Has enviado ${amount} SocialCoins a ${clubName}.`,
        })
    }

    return (
        <>
            <ClubActions socialCoins={socialCoins} onTipClick={() => setShowTipDialog(true)} />

            <NotificationsToggle
                enabled={notificationsEnabled}
                onChange={setNotificationsEnabled}
                color={clubColor}
            />

            <TipDialog
                open={showTipDialog}
                onOpenChange={setShowTipDialog}
                clubName={clubName}
                socialCoins={socialCoins}
                onSendTip={handleSendTip}
            />

            <TipSuccessDialog
                open={showSuccessDialog}
                onOpenChange={setShowSuccessDialog}
                clubName={clubName}
                amount={lastTipAmount}
            />
        </>
    )
}
