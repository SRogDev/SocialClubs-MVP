"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Coins } from "lucide-react"

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog"

type TipDialogProps = {
    open: boolean
    onOpenChange: (open: boolean) => void
    clubName: string
    socialCoins: number
    onSendTip: (amount: number) => Promise<void>
}

export default function TipDialog({ open, onOpenChange, clubName, socialCoins, onSendTip }: TipDialogProps) {
    const [tipAmount, setTipAmount] = useState("10")
    const [isProcessing, setIsProcessing] = useState(false)

    const handleSendTip = async () => {
        setIsProcessing(true)
        await onSendTip(Number.parseInt(tipAmount))
        setIsProcessing(false)
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md rounded-xl border border-amber-100 dark:border-amber-900/30 shadow-lg">
                <DialogHeader>
                    <DialogTitle className="font-serif">Enviar propina a {clubName}</DialogTitle>
                    <DialogDescription>
                        Apoya a este club enviando SocialCoins. Tus propinas ayudan a mantener contenido de calidad.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                    <div className="space-y-2">
                        <Label htmlFor="tip-amount">Cantidad de SocialCoins</Label>
                        <Input
                            id="tip-amount"
                            type="number"
                            min="1"
                            max={socialCoins}
                            value={tipAmount}
                            onChange={(e) => setTipAmount(e.target.value)}
                            className="text-center text-lg"
                        />
                        <p className="text-xs text-center text-muted-foreground">Tienes {socialCoins} SocialCoins disponibles</p>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} className="rounded-full">
                        Cancelar
                    </Button>
                    <Button onClick={handleSendTip} variant="gradient" className="rounded-full" disabled={isProcessing}>
                        {isProcessing ? <DotsLoader variant="premium" className="mr-2" /> : <Coins size={16} className="mr-2" />}
                        Enviar propina
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
