"use client"

import { Flame } from "lucide-react"
import { useState } from "react"

import SuperlikeModal from "@/components/post/superlike-modal"
import { Button } from "@/components/ui/button"

interface SuperlikesSectionProps {
    superlikes: number
}

export default function SuperlikesSection({ superlikes }: SuperlikesSectionProps) {
    const [isSuperlikeModalOpen, setIsSuperlikeModalOpen] = useState(false)

    return (
        <>
            <Button
                variant="outline"
                className="flex-1 gap-2"
                onClick={() => setIsSuperlikeModalOpen(true)}
            >
                <Flame className="h-4 w-4" />
                {superlikes} superlikes
            </Button>

            <SuperlikeModal
                open={isSuperlikeModalOpen}
                onOpenChange={setIsSuperlikeModalOpen}
            />
        </>
    )
}
