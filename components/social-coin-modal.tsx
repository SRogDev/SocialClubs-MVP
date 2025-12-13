"use client"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Coins, Check, Sparkles } from "lucide-react"
import { useState } from "react"
import { DotsLoader } from "@/components/ui/spinner"

interface SocialCoinModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onPurchase: (amount: number) => void
}

export default function SocialCoinModal({ open, onOpenChange, onPurchase }: SocialCoinModalProps) {
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)

  const packages = [
    {
      id: "basic",
      coins: 100,
      price: "$4.99",
      popular: false,
      description: "Ideal para enviar propinas ocasionales",
    },
    {
      id: "premium",
      coins: 500,
      price: "$19.99",
      popular: true,
      description: "El más popular, ahorra un 20%",
    },
    {
      id: "ultimate",
      coins: 1200,
      price: "$39.99",
      popular: false,
      description: "Mejor valor, ahorra un 33%",
    },
  ]

  const handlePurchase = (amount: number) => {
    setIsProcessing(true)
    // Simular procesamiento
    setTimeout(() => {
      setIsProcessing(false)
      onPurchase(amount)
    }, 1500)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-xl border border-amber-100 dark:border-amber-900/30 shadow-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-center text-xl font-serif">
            <Coins className="h-6 w-6 text-amber-500 mr-2" />
            Comprar SocialCoins
          </DialogTitle>
          <DialogDescription className="text-center pt-2">
            Las SocialCoins te permiten apoyar a tus creadores favoritos y desbloquear contenido exclusivo.
          </DialogDescription>
        </DialogHeader>
        <div className="p-2 space-y-4">
          {packages.map((pkg) => (
            <div
              key={pkg.id}
              className={`relative border rounded-xl p-4 transition-all duration-300 cursor-pointer
                ${selectedPackage === pkg.id ? "ring-2 ring-amber-300 dark:ring-amber-700" : ""}
                ${pkg.popular ? "border-amber-400 bg-amber-50/50 dark:bg-amber-900/10" : "hover:border-amber-200 dark:hover:border-amber-800"}
                hover:shadow-md hover:translate-y-[-2px]`}
              onClick={() => setSelectedPackage(pkg.id)}
            >
              {pkg.popular && (
                <div className="absolute -top-2 -right-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs rounded-full px-2 py-0.5 shadow-md">
                  Popular
                </div>
              )}
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center">
                  <Coins className="h-5 w-5 text-amber-500 mr-2" />
                  <span className="text-lg font-serif font-semibold">{pkg.coins} SocialCoins</span>
                </div>
                <span className="text-xl font-bold">{pkg.price}</span>
              </div>
              <p className="text-sm text-muted-foreground mb-3">{pkg.description}</p>
              <Button
                onClick={() => handlePurchase(pkg.coins)}
                variant={pkg.popular ? "gradient" : "premium"}
                className="w-full"
                disabled={isProcessing}
              >
                {isProcessing && selectedPackage === pkg.id ? (
                  <DotsLoader variant="premium" className="mr-2" />
                ) : pkg.popular ? (
                  <Sparkles size={16} className="mr-2 animate-pulse" />
                ) : (
                  <Check size={16} className="mr-2" />
                )}
                Comprar
              </Button>
            </div>
          ))}
        </div>
        <DialogFooter className="flex flex-col sm:flex-row sm:justify-center">
          <p className="text-xs text-center text-muted-foreground">
            Las compras se procesarán a través de tu método de pago preferido. Los SocialCoins no son reembolsables.
          </p>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
