"use client"

import { Button } from "@/components/ui/button"
import { Coins, Check } from "lucide-react"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog"

type TipSuccessDialogProps = {
    open: boolean
    onOpenChange: (open: boolean) => void
    clubName: string
    amount: number
}

export default function TipSuccessDialog({ open, onOpenChange, clubName, amount }: TipSuccessDialogProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md rounded-xl border border-amber-100 dark:border-amber-900/30 shadow-lg">
                <DialogHeader>
                    <DialogTitle className="text-center flex items-center justify-center font-serif">
                        <div className="bg-green-100 dark:bg-green-900/30 p-2 rounded-full mr-2">
                            <Check size={20} className="text-green-500" />
                        </div>
                        ¡Propina enviada con éxito!
                    </DialogTitle>
                </DialogHeader>
                <div className="py-4 text-center">
                    <div className="mb-4 flex justify-center">
                        <div className="relative">
                            <Coins size={48} className="text-amber-500 animate-pulse" />
                            <div className="absolute -top-2 -right-2 bg-green-100 dark:bg-green-900/30 rounded-full p-1">
                                <Check size={16} className="text-green-500" />
                            </div>
                        </div>
                    </div>
                    <p className="mb-2 font-serif">
                        Excelente, has apoyado al Club <span className="font-bold">{clubName}</span> con{" "}
                        <span className="font-bold text-amber-500">{amount} SocialCoins</span>.
                    </p>
                    <p className="text-sm text-muted-foreground">
                        Tu apoyo ayuda a mantener contenido de calidad en la plataforma.
                    </p>
                </div>
                <DialogFooter>
                    <Button
                        onClick={() => onOpenChange(false)}
                        className="w-full rounded-full transition-all hover:scale-105 bg-gradient-to-r from-amber-500 to-orange-500"
                    >
                        Aceptar
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
