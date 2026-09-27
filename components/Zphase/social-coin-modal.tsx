"use client"

import { Coins } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

type SocialCoinModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

/** Modal explaining / managing the club's social coins. */
export default function SocialCoinModal({ open, onOpenChange }: SocialCoinModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Coins className="h-5 w-5" />
            Monedas sociales
          </DialogTitle>
          <DialogDescription>
            Las monedas sociales premian tu participación en el club. Gánalas
            asistiendo a eventos, publicando y ayudando a otros miembros.
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-end">
          <Button onClick={() => onOpenChange(false)}>Entendido</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
