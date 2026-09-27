"use client"

import { Coins } from "lucide-react"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import SocialCoinModal from "@/components/Zphase/social-coin-modal"

interface SocialCoinsSectionProps {
    coins: number
}

export default function SocialCoinsSection({ coins }: SocialCoinsSectionProps) {
    const [isCoinModalOpen, setIsCoinModalOpen] = useState(false)

    return (
        <>
            <Button
                variant="outline"
                className="flex-1 gap-2"
                onClick={() => setIsCoinModalOpen(true)}
            >
                <Coins className="h-4 w-4" />
                {coins} monedas
            </Button>

            <SocialCoinModal
                open={isCoinModalOpen}
                onOpenChange={setIsCoinModalOpen}
            />
        </>
    )
}
