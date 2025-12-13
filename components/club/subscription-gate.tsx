import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Lock } from "lucide-react"
import type { Channel } from "@/types/club"

interface SubscriptionGateProps {
  channel: Channel
}

export default function SubscriptionGate({ channel }: SubscriptionGateProps) {
  return (
    <div className="p-4">
      <Card className="text-center">
        <CardHeader>
          <div className="mx-auto w-12 h-12 bg-muted rounded-full flex items-center justify-center mb-4">
            <Lock size={24} className="text-muted-foreground" />
          </div>
          <CardTitle className="text-lg">Canal Premium</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-4">
            {channel.benefits || `Accede al canal ${channel.name} por solo $${channel.price}/mes`}
          </p>
          <Button size="sm" className="w-full">
            Suscribirse por ${channel.price}/mes
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
