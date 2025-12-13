"use client"

import { useState } from "react"
import { Compass } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import type { WidgetData } from "@/types/widget"

interface WidgetWheelProps {
  data: WidgetData
  preview?: boolean
}

export default function WidgetWheel({ data, preview = false }: WidgetWheelProps) {
  const [isSpinning, setIsSpinning] = useState(false)

  const handleSpin = () => {
    setIsSpinning(true)
    setTimeout(() => setIsSpinning(false), 3000)
  }

  return (
    <Card className="overflow-hidden transition-all duration-300 hover:shadow-md">
      <CardContent className="p-4">
        <div className="flex items-center mb-3">
          <Compass size={18} className="mr-2 text-primary" />
          <h3 className="font-medium">{data.title}</h3>
        </div>
        <div className="relative h-40 w-full flex items-center justify-center">
          <div className="w-32 h-32 rounded-full border-4 border-primary relative overflow-hidden">
            <div className="absolute inset-0 flex items-center justify-center">
              <Compass size={24} className={`text-primary ${isSpinning ? "animate-spin" : ""}`} />
            </div>
          </div>
          {!preview && (
            <Button variant="outline" size="sm" className="absolute bottom-0 bg-transparent" onClick={handleSpin}>
              Girar
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
