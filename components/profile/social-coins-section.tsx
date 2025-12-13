"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Coins } from "lucide-react"
import SocialCoinModal from "@/components/social-coin-modal"

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
