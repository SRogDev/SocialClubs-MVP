"use client"

import { Flame, Sparkles } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface SuperlikeModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onPurchase: () => void
}

export default function SuperlikeModal({ open, onOpenChange, onPurchase }: SuperlikeModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-center text-xl">
            <Flame className="h-6 w-6 text-orange-500 mr-2" />
            ¡Te has quedado sin Superlikes!
          </DialogTitle>
          <DialogDescription className="text-center pt-2">
            Los superlikes hacen que tu aprecio destaque sobre los demás y permiten que los creadores te noten.
          </DialogDescription>
        </DialogHeader>
        <div className="p-6 space-y-4">
          <div className="bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 rounded-lg p-4 border border-yellow-200 dark:border-yellow-700/30">
            <p className="text-center font-medium mb-2">
              Tu apoyo ayuda a los creadores a seguir publicando contenido de calidad.
            </p>
            <p className="text-center text-sm text-muted-foreground">
              Al comprar superlikes no solo destacas entre la comunidad, sino que también apoyas directamente a tus
              creadores favoritos.
            </p>
          </div>

          <div className="flex justify-center">
            <div className="relative">
              <div className="absolute -top-2 -right-2 bg-primary text-primary-foreground text-xs rounded-full px-2 py-0.5">
                ¡Mejor valor!
              </div>
              <div className="border rounded-lg p-4 text-center bg-background shadow-sm">
                <div className="flex justify-center mb-2">
                  <Flame className="h-8 w-8 text-orange-500" />
                  <Flame className="h-8 w-8 text-orange-500" />
                  <Flame className="h-8 w-8 text-orange-500" />
                </div>
                <p className="text-lg font-bold">30 Superlikes</p>
                <p className="text-sm text-muted-foreground mb-3">Un mes de reconocimiento</p>
                <p className="text-2xl font-bold text-primary mb-3">$4.99</p>
              </div>
            </div>
          </div>
        </div>
        <DialogFooter className="flex flex-col sm:flex-row sm:justify-center">
          <Button
            onClick={onPurchase}
            className="bg-gradient-to-r from-orange-500 to-yellow-500 text-white hover:from-orange-600 hover:to-yellow-600 transition-all w-full"
            size="lg"
          >
            <Sparkles size={16} className="mr-2" />
            Comprar ahora
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
