"use client"

import { Button } from "@/components/ui/button"
import { Coins } from "lucide-react"

type ClubActionsProps = {
    socialCoins: number
    onTipClick: () => void
}

export default function ClubActions({ socialCoins, onTipClick }: ClubActionsProps) {
    return (
        <div className="flex items-center justify-center gap-3 mb-4">
            <Button
                size="sm"
                className="transition-transform hover:scale-105 bg-gradient-to-r from-amber-500 to-orange-500"
                onClick={onTipClick}
            >
                <Coins size={16} className="mr-1" />
                Enviar propina
            </Button>
            <div className="flex items-center bg-gradient-to-r from-amber-100 to-orange-100 dark:from-amber-900/20 dark:to-orange-900/20 px-3 py-1 rounded-full shadow-sm">
                <Coins size={14} className="text-amber-500 mr-1" />
                <span className="text-amber-600 dark:text-amber-400 text-sm font-medium">{socialCoins}</span>
            </div>
        </div>
    )
}
