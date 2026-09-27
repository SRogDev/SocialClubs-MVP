"use client"

import { ChevronDown, ChevronUp } from "lucide-react"
import { useState } from "react"

import SubscriptionCard from "@/components/club/subscription-card"
import { Button } from "@/components/ui/button"

interface SubscriptionSectionProps {
  subscriptionsCount: number
  subscriptions: {
    id: string
    clubName: string
    clubImage: string
    channelName: string
    price: number
    billingPeriod: "monthly" | "yearly"
  }[]
  onCancelSubscription: (id: string) => void
}

export default function SubscriptionSection({
  subscriptionsCount,
  subscriptions,
  onCancelSubscription,
}: SubscriptionSectionProps) {
  const [showSubscriptions, setShowSubscriptions] = useState(false)

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <h2 className="text-sm font-medium text-muted-foreground">Suscripciones</h2>
          <div className="ml-2 bg-gradient-to-r from-amber-100 to-orange-100 dark:from-amber-900/20 dark:to-orange-900/20 rounded-full h-6 w-6 flex items-center justify-center text-xs font-medium shadow-sm">
            {subscriptionsCount}
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="p-1 h-auto ml-1 group"
            onClick={() => setShowSubscriptions(!showSubscriptions)}
            aria-label={showSubscriptions ? "Ocultar suscripciones" : "Mostrar suscripciones"}
          >
            {showSubscriptions ? (
              <ChevronUp
                size={18}
                className="text-muted-foreground transition-transform duration-300 group-hover:-translate-y-1"
              />
            ) : (
              <ChevronDown
                size={18}
                className="text-muted-foreground transition-transform duration-300 group-hover:translate-y-1"
              />
            )}
          </Button>
        </div>
      </div>

      <div
        className={`transition-all duration-700 ease-in-out overflow-hidden ${showSubscriptions ? "max-h-[1000px] opacity-100 mt-4" : "max-h-0 opacity-0"
          }`}
      >
        <div className="grid grid-cols-3 gap-3 md:grid-cols-4">
          {subscriptions.map((subscription) => (
            <SubscriptionCard
              key={subscription.id}
              id={subscription.id}
              clubName={subscription.clubName}
              clubImage={subscription.clubImage}
              channelName={subscription.channelName}
              price={subscription.price}
              billingPeriod={subscription.billingPeriod}
              onCancel={onCancelSubscription}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
