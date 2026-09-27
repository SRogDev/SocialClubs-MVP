"use client"

import { X, ExternalLink, Loader2 } from "lucide-react"
import { useState } from "react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"

interface SubscriptionCardProps {
  id: string
  clubName: string
  clubImage: string
  channelName: string
  price: number
  billingPeriod: "monthly" | "yearly"
  onCancel: (id: string) => void
}

export default function SubscriptionCard({
  id,
  clubName,
  clubImage,
  channelName,
  price,
  billingPeriod,
  onCancel,
}: SubscriptionCardProps) {
  const [isHovered, setIsHovered] = useState(false)
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  const handleManage = async () => {
    setLoading(true)
    try {
      // Abrir Customer Portal de Stripe
      const response = await fetch('/api/stripe/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          return_url: window.location.href,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al abrir portal')
      }

      // Redirigir al portal de Stripe
      window.location.href = data.url
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'No se pudo abrir el portal de gestión',
        variant: 'destructive',
      })
      setLoading(false)
    }
  }

  return (
    <div
      className="flex flex-col items-center p-3 border rounded-xl transition-all duration-300 hover:shadow-md hover:translate-y-[-2px] hover:border-amber-200 dark:hover:border-amber-800"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Avatar className="h-16 w-16 mb-2 hover:scale-105 transition-transform">
        <AvatarImage src={clubImage || "/placeholder.svg"} alt={clubName} />
        <AvatarFallback>{clubName.substring(0, 2).toUpperCase()}</AvatarFallback>
      </Avatar>
      <h3 className="font-medium text-sm text-center">{clubName}</h3>
      <p className="text-xs text-muted-foreground text-center mb-1">{channelName}</p>
      <p className="text-sm font-semibold mb-2 text-amber-600 dark:text-amber-400">
        ${price}/{billingPeriod === "monthly" ? "mes" : "año"}
      </p>

      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          className="text-xs rounded-full transition-all"
          onClick={handleManage}
          disabled={loading}
        >
          {loading ? (
            <Loader2 className="h-3 w-3 animate-spin mr-1" />
          ) : (
            <ExternalLink size={14} className="mr-1" />
          )}
          Gestionar
        </Button>

        <Button
          variant="outline"
          size="sm"
          className={`text-xs text-destructive border-destructive hover:bg-destructive/10 rounded-full transition-all ${isHovered ? "opacity-100" : "opacity-70"}`}
          onClick={() => onCancel(id)}
        >
          <X size={14} className="mr-1" />
          Cancelar
        </Button>
      </div>
    </div>
  )
}
