"use client"

import { Rocket, TestTube, Gamepad2, Video, CreditCard } from "lucide-react"
import { useRef } from "react"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"

const roadmapPhases = [
  {
    title: "Acceso anticipado",
    description: "Primeros clubes de creadores abriendo sus puertas. Suscripciones mensuales y contenido exclusivo funcionando.",
    status: "current",
    icon: <Rocket className="h-5 w-5" />,
  },
  {
    title: "Monetización completa",
    description: "Videollamadas pagadas, niveles de membresía y panel de ingresos para cada creador.",
    status: "upcoming",
    icon: <CreditCard className="h-5 w-5" />,
  },
  {
    title: "Eventos en vivo",
    description: "Eventos exclusivos para miembros: transmisiones, encuentros y experiencias solo para tu club.",
    status: "upcoming",
    icon: <Video className="h-5 w-5" />,
  },
  {
    title: "Comunidad avanzada",
    description: "Gamificación, recompensas y herramientas para mantener a tus miembros activos mes a mes.",
    status: "future",
    icon: <Gamepad2 className="h-5 w-5" />,
  },
  {
    title: "Escala",
    description: "Pruebas de producto, optimización y soporte para clubes de miles de miembros.",
    status: "future",
    icon: <TestTube className="h-5 w-5" />,
  },
]

export function RoadMapComponent() {
  const scrollRef = useRef<HTMLDivElement>(null)

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "current":
        return <Badge className="bg-primary text-primary-foreground text-xs">Actual</Badge>
      case "upcoming":
        return (
          <Badge variant="secondary" className="text-xs">
            Próximo
          </Badge>
        )
      case "future":
        return (
          <Badge variant="outline" className="text-xs">
            Futuro
          </Badge>
        )
      default:
        return null
    }
  }

  return (
    <section id="roadmap" className="py-12 md:py-20 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-8 md:mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-2 md:mb-4 text-foreground">Roadmap</h2>
          <h3 className="text-lg md:text-2xl font-semibold text-primary">El camino de tu club</h3>
        </div>

        {/* Horizontal Timeline */}
        <div className="relative">
          <div
            ref={scrollRef}
            className="flex gap-6 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-primary scrollbar-track-muted"
            style={{ scrollSnapType: "x mandatory" }}
          >
            {roadmapPhases.map((phase, index) => (
              <Card
                key={index}
                className={`flex-shrink-0 w-80 transition-all duration-300 hover:shadow-lg ${
                  phase.status === "current"
                    ? "border-primary bg-primary/5 shadow-md"
                    : "border-muted bg-card hover:border-primary/50"
                }`}
                style={{ scrollSnapAlign: "start" }}
              >
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div
                      className={`p-3 rounded-full ${
                        phase.status === "current" ? "bg-primary text-primary-foreground" : "bg-muted"
                      }`}
                    >
                      {phase.icon}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold text-lg text-foreground">{phase.title}</h4>
                        {getStatusBadge(phase.status)}
                      </div>

                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">{phase.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Timeline Line */}
          <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-gradient-to-r from-primary via-primary/50 to-muted -translate-y-1/2 -z-10"></div>
        </div>

        {/* Scroll Hint */}
        <div className="text-center mt-6">
          <p className="text-sm text-muted-foreground">← Desliza para ver más fases →</p>
        </div>
      </div>
    </section>
  )
}
