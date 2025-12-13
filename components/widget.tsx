"use client"

import { Link2, ExternalLink, Brain, Compass, Dices, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { useState } from "react"

interface WidgetProps {
  data: {
    type: string
    title: string
    [key: string]: any
  }
  preview?: boolean
}

export default function Widget({ data, preview = false }: WidgetProps) {
  const [isInteracting, setIsInteracting] = useState(false)

  // Renderizar el widget según su tipo
  const renderWidgetContent = () => {
    switch (data.type) {
      case "magic-link":
        return (
          <>
            <div className="flex items-center mb-3">
              <Link2 size={18} className="mr-2 text-primary" />
              <h3 className="font-medium">{data.title}</h3>
            </div>
            <a href={data.url} target="_blank" rel="noopener noreferrer" className="block w-full">
              <Button className="w-full group">
                <span className="mr-2">Visitar enlace</span>
                <ExternalLink
                  size={16}
                  className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform"
                />
              </Button>
            </a>
          </>
        )

      case "meta":
        return (
          <>
            <div className="flex items-center mb-3">
              <Brain size={18} className="mr-2 text-primary" />
              <h3 className="font-medium">{data.title}</h3>
            </div>
            <div className="p-3 bg-muted/30 rounded-md text-sm">{data.content}</div>
          </>
        )

      case "wheel":
        return (
          <>
            <div className="flex items-center mb-3">
              <Compass size={18} className="mr-2 text-primary" />
              <h3 className="font-medium">{data.title}</h3>
            </div>
            <div className="relative h-40 w-full flex items-center justify-center">
              <div className="w-32 h-32 rounded-full border-4 border-primary relative overflow-hidden">
                <div className="absolute inset-0 flex items-center justify-center">
                  <Compass size={24} className={`text-primary ${isInteracting ? "animate-spin" : ""}`} />
                </div>
              </div>
              {!preview && (
                <Button
                  variant="outline"
                  size="sm"
                  className="absolute bottom-0"
                  onClick={() => {
                    setIsInteracting(true)
                    setTimeout(() => setIsInteracting(false), 3000)
                  }}
                >
                  Girar
                </Button>
              )}
            </div>
          </>
        )

      case "mural":
        return (
          <>
            <div className="flex items-center mb-3">
              <Dices size={18} className="mr-2 text-primary" />
              <h3 className="font-medium">{data.title}</h3>
            </div>
            <div className="p-3 bg-muted/30 rounded-md text-sm mb-2">{data.description}</div>
            {!preview && (
              <Button variant="outline" size="sm" className="w-full">
                Colaborar
              </Button>
            )}
          </>
        )

      case "surprise":
        return (
          <>
            <div className="flex items-center mb-3">
              <Sparkles size={18} className="mr-2 text-primary" />
              <h3 className="font-medium">{data.title}</h3>
            </div>
            <div className="h-24 bg-muted/30 rounded-md flex items-center justify-center">
              {isInteracting ? (
                <div className="text-center p-2">
                  <p className="text-sm">¡Sorpresa revelada!</p>
                  <p className="text-xs text-muted-foreground mt-1">Contenido aleatorio generado</p>
                </div>
              ) : (
                <Sparkles size={24} className="text-primary animate-pulse" />
              )}
            </div>
            {!preview && (
              <Button
                variant="outline"
                size="sm"
                className="w-full mt-2"
                onClick={() => {
                  setIsInteracting(true)
                  setTimeout(() => setIsInteracting(false), 5000)
                }}
              >
                Revelar sorpresa
              </Button>
            )}
          </>
        )

      default:
        return <div className="p-3 bg-muted/30 rounded-md text-sm">Widget no reconocido</div>
    }
  }

  return (
    <Card className="overflow-hidden transition-all duration-300 hover:shadow-md">
      <CardContent className="p-4">{renderWidgetContent()}</CardContent>
    </Card>
  )
}
