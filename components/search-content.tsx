"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Search, ChevronRight } from "lucide-react"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import TrendCard from "@/components/trend-card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Sparkles } from "lucide-react"
import Image from "next/image"
import Link from "next/link"

// Datos de ejemplo para las tendencias
const mockStatTrends = [
  {
    id: "1",
    title: "Usuarios activos",
    value: "25,432",
    change: "+12%",
    icon: "users",
  },
  {
    id: "2",
    title: "Nuevos clubs esta semana",
    value: "342",
    change: "+8%",
    icon: "trending",
  },
  {
    id: "3",
    title: "Eventos programados",
    value: "156",
    change: "+23%",
    icon: "clock",
  },
  {
    id: "4",
    title: "Posts diarios",
    value: "1,245",
    change: "+15%",
    icon: "chart",
  },
  {
    id: "5",
    title: "Nuevos usuarios",
    value: "876",
    change: "+5%",
    icon: "users",
  },
]

const mockTopicTrends = [
  {
    id: "1",
    title: "Tendencia en baile",
    value: "Baile de la rusa",
    description: "0 posts sobre este tema",
    icon: "hashtag",
  },
  {
    id: "2",
    title: "Búsqueda popular",
    value: "Inteligencia Artificial",
    description: "2,450 posts esta semana",
    icon: "trending",
  },
  {
    id: "3",
    title: "Tema emergente",
    value: "Desarrollo sostenible",
    description: "Crecimiento del 120% en menciones",
    icon: "chart",
  },
  {
    id: "4",
    title: "Evento destacado",
    value: "Hackathon Global",
    description: "Miles de participantes registrados",
    icon: "users",
  },
  {
    id: "5",
    title: "Tecnología en tendencia",
    value: "Realidad aumentada",
    description: "Interés creciente en la comunidad",
    icon: "trending",
  },
]

// Datos de ejemplo para clubs recomendados
const mockRecommendedClubs = [
  {
    id: "1",
    name: "Programación",
    image: "/placeholder.svg?height=60&width=60",
    members: 1250,
    description: "Comunidad para desarrolladores y entusiastas de la programación.",
    color: "#f97316",
  },
  {
    id: "2",
    name: "Diseño UX/UI",
    image: "/placeholder.svg?height=60&width=60",
    members: 980,
    description: "Comparte y aprende sobre diseño de experiencias e interfaces.",
    color: "#3b82f6",
  },
  {
    id: "3",
    name: "Marketing Digital",
    image: "/placeholder.svg?height=60&width=60",
    members: 1540,
    description: "Estrategias y tendencias en marketing digital.",
    color: "#10b981",
  },
  {
    id: "4",
    name: "Fotografía Profesional",
    image: "/placeholder.svg?height=60&width=60",
    members: 750,
    description: "Técnicas avanzadas de fotografía y edición de imágenes.",
    color: "#8b5cf6",
  },
  {
    id: "5",
    name: "Desarrollo Personal",
    image: "/placeholder.svg?height=60&width=60",
    members: 2100,
    description: "Recursos para mejorar habilidades personales y profesionales.",
    color: "#ec4899",
  },
  {
    id: "6",
    name: "Finanzas Personales",
    image: "/placeholder.svg?height=60&width=60",
    members: 1820,
    description: "Consejos para administrar mejor tu dinero e inversiones.",
    color: "#eab308",
  },
  {
    id: "7",
    name: "Cocina Gourmet",
    image: "/placeholder.svg?height=60&width=60",
    members: 1350,
    description: "Recetas exclusivas y técnicas culinarias avanzadas.",
    color: "#ef4444",
  },
  {
    id: "8",
    name: "Viajes y Aventuras",
    image: "/placeholder.svg?height=60&width=60",
    members: 1680,
    description: "Destinos exóticos y consejos para viajeros.",
    color: "#06b6d4",
  },
  {
    id: "9",
    name: "Fitness y Bienestar",
    image: "/placeholder.svg?height=60&width=60",
    members: 2250,
    description: "Rutinas de ejercicio y consejos para una vida saludable.",
    color: "#f97316",
  },
]

// Datos de ejemplo para nuevos clubs
const mockNewClubs = [
  {
    id: "10",
    name: "Inteligencia Artificial",
    image: "/placeholder.svg?height=60&width=60",
    members: 320,
    description: "Explora las últimas tendencias en IA y machine learning.",
    daysOld: 3,
    color: "#3b82f6",
  },
  {
    id: "11",
    name: "Fotografía",
    image: "/placeholder.svg?height=60&width=60",
    members: 215,
    description: "Para amantes de la fotografía de todos los niveles.",
    daysOld: 5,
    color: "#8b5cf6",
  },
  {
    id: "12",
    name: "Emprendimiento",
    image: "/placeholder.svg?height=60&width=60",
    members: 178,
    description: "Recursos y consejos para emprendedores.",
    daysOld: 7,
    color: "#10b981",
  },
  {
    id: "13",
    name: "Criptomonedas",
    image: "/placeholder.svg?height=60&width=60",
    members: 145,
    description: "Análisis y discusiones sobre blockchain y criptomonedas.",
    daysOld: 2,
    color: "#f97316",
  },
  {
    id: "14",
    name: "Arte Digital",
    image: "/placeholder.svg?height=60&width=60",
    members: 192,
    description: "Creación y venta de NFTs y arte digital.",
    daysOld: 4,
    color: "#ec4899",
  },
  {
    id: "15",
    name: "Ciencia de Datos",
    image: "/placeholder.svg?height=60&width=60",
    members: 230,
    description: "Análisis de datos, visualización y machine learning.",
    daysOld: 6,
    color: "#06b6d4",
  },
]

// Componente para mostrar un club en formato horizontal
const HorizontalClubCard = ({ club }: { club: any }) => {
  return (
    <div className="w-64 flex-shrink-0 mr-4">
      <Link href={`/clubs/${club.id}/info`}>
        <div
          className="h-full p-4 rounded-lg hover:bg-accent/50 transition-all duration-300 border"
          style={{ borderColor: `${club.color}20` }}
        >
          <div className="flex flex-col items-center">
            <div className="relative">
              <Avatar
                className="h-16 w-16 mb-3 hover:scale-105 transition-transform"
                style={{ borderColor: club.color, borderWidth: "2px" }}
              >
                <Image
                  src={club.image || "/placeholder.svg"}
                  alt={club.name}
                  width={64}
                  height={64}
                  className="h-16 w-16 rounded-full object-cover"
                />
                <AvatarFallback>{club.name.substring(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              {club.daysOld && (
                <div className="absolute -top-1 -right-1">
                  <Sparkles size={16} className="text-amber-500 animate-pulse" />
                </div>
              )}
            </div>
            <h3 className="font-serif font-medium text-center">{club.name}</h3>
            <p className="text-xs text-muted-foreground text-center mb-2">{club.members} miembros</p>
            {club.daysOld && (
              <Badge variant="premium" className="mb-2">
                Nuevo
              </Badge>
            )}
            <p className="text-xs text-center line-clamp-2">{club.description}</p>
          </div>
        </div>
      </Link>
    </div>
  )
}

export default function SearchContent() {
  const [searchQuery, setSearchQuery] = useState("")
  const [activeTab, setActiveTab] = useState("clubs")

  // Dividir los clubs recomendados en filas
  const recommendedRows = [
    mockRecommendedClubs.slice(0, 3),
    mockRecommendedClubs.slice(3, 6),
    mockRecommendedClubs.slice(6, 9),
  ]

  // Dividir los nuevos clubs en filas
  const newRows = [mockNewClubs.slice(0, 3), mockNewClubs.slice(3, 6)]

  return (
    <div className="container py-6">
      <div className="sticky top-0 bg-background pt-2 pb-4 z-10">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={18} />
          <Input
            placeholder="Buscar clubs, productos, eventos o personas..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
            aria-label="Buscar en la plataforma"
          />
        </div>
      </div>

      {!searchQuery && (
        <>
          <section className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-serif font-semibold">Tendencias</h2>
              <Button variant="ghost" size="sm" className="group">
                <span className="text-sm text-primary group-hover:underline">Ver más</span>
                <ChevronRight size={16} className="ml-1 group-hover:translate-x-1 transition-transform" />
              </Button>
            </div>
            <ScrollArea className="w-full whitespace-nowrap pb-4">
              <div className="flex space-x-4">
                {mockStatTrends.map((trend) => (
                  <TrendCard
                    key={trend.id}
                    title={trend.title}
                    value={trend.value}
                    type="stat"
                    icon={trend.icon as any}
                    change={trend.change}
                  />
                ))}
              </div>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          </section>

          <section className="mb-8">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-serif font-semibold">Temas populares</h2>
              <Button variant="ghost" size="sm" className="group">
                <span className="text-sm text-primary group-hover:underline">Ver más</span>
                <ChevronRight size={16} className="ml-1 group-hover:translate-x-1 transition-transform" />
              </Button>
            </div>
            <ScrollArea className="w-full whitespace-nowrap pb-4">
              <div className="flex space-x-4">
                {mockTopicTrends.map((trend) => (
                  <TrendCard
                    key={trend.id}
                    title={trend.title}
                    value={trend.value}
                    description={trend.description}
                    type="topic"
                    icon={trend.icon as any}
                  />
                ))}
              </div>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          </section>
        </>
      )}

      <Tabs defaultValue="clubs" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-4 mb-6 rounded-full">
          <TabsTrigger value="clubs" className="rounded-full">
            Clubs
          </TabsTrigger>
          <TabsTrigger value="products" className="rounded-full">
            Productos
          </TabsTrigger>
          <TabsTrigger value="events" className="rounded-full">
            Eventos
          </TabsTrigger>
          <TabsTrigger value="people" className="rounded-full">
            Personas
          </TabsTrigger>
        </TabsList>

        <TabsContent value="clubs">
          {!searchQuery ? (
            <>
              <section className="mb-8">
                <h2 className="text-xl font-serif font-semibold mb-4">Clubs recomendados</h2>
                {recommendedRows.map((row, index) => (
                  <div key={`rec-row-${index}`} className="mb-6">
                    <ScrollArea className="w-full pb-4">
                      <div className="flex">
                        {row.map((club) => (
                          <HorizontalClubCard key={club.id} club={club} />
                        ))}
                      </div>
                      <ScrollBar orientation="horizontal" />
                    </ScrollArea>
                  </div>
                ))}
              </section>

              <section>
                <h2 className="text-xl font-serif font-semibold mb-4">Clubs nuevos</h2>
                {newRows.map((row, index) => (
                  <div key={`new-row-${index}`} className="mb-6">
                    <ScrollArea className="w-full pb-4">
                      <div className="flex">
                        {row.map((club) => (
                          <HorizontalClubCard key={club.id} club={club} />
                        ))}
                      </div>
                      <ScrollBar orientation="horizontal" />
                    </ScrollArea>
                  </div>
                ))}
              </section>
            </>
          ) : (
            <div className="space-y-4">
              <ScrollArea className="w-full pb-4">
                <div className="flex">
                  {mockRecommendedClubs
                    .concat(mockNewClubs)
                    .slice(0, 5)
                    .map((club) => (
                      <HorizontalClubCard key={club.id} club={club} />
                    ))}
                </div>
                <ScrollBar orientation="horizontal" />
              </ScrollArea>
            </div>
          )}
        </TabsContent>

        <TabsContent value="products" className="space-y-4">
          <div className="flex items-center justify-center h-40 text-muted-foreground">
            Próximamente: búsqueda de productos
          </div>
        </TabsContent>

        <TabsContent value="events" className="space-y-4">
          <div className="flex items-center justify-center h-40 text-muted-foreground">
            Próximamente: búsqueda de eventos
          </div>
        </TabsContent>

        <TabsContent value="people" className="space-y-4">
          <div className="flex items-center justify-center h-40 text-muted-foreground">
            Próximamente: búsqueda de personas
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
