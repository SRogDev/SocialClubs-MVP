"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Search } from "lucide-react"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import TrendCard from "@/components/trend-card"

// Datos de ejemplo para las tendencias de búsqueda
const mockSearchTrends = [
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

// Datos de ejemplo para más tendencias de búsqueda
const mockMoreSearchTrends = [
  {
    id: "6",
    title: "Tema del momento",
    value: "Energías renovables",
    description: "Creciente interés en la comunidad",
    icon: "zap",
  },
  {
    id: "7",
    title: "Búsqueda en alza",
    value: "Criptomonedas",
    description: "1,230 posts esta semana",
    icon: "trending",
  },
  {
    id: "8",
    title: "Tendencia global",
    value: "Cambio climático",
    description: "Discusiones en aumento",
    icon: "globe",
  },
  {
    id: "9",
    title: "Tema popular",
    value: "Trabajo remoto",
    description: "Muchas menciones recientes",
    icon: "users",
  },
  {
    id: "10",
    title: "Tendencia emergente",
    value: "Metaverso",
    description: "Interés creciente",
    icon: "trending",
  },
]

// Datos de ejemplo para clubes curiosos - alto rendimiento
const mockCuriousClubs1 = [
  {
    id: "1",
    title: "Club más activo",
    value: "Programación",
    description: "15,230 mensajes este mes",
    icon: "zap",
  },
  {
    id: "2",
    title: "Récord de crecimiento",
    value: "Diseño UX/UI",
    description: "500 nuevos miembros en un día",
    icon: "award",
  },
  {
    id: "3",
    title: "Mayor tiempo de uso",
    value: "Club de Lectura",
    description: "Promedio de 45 min por sesión",
    icon: "clock",
  },
  {
    id: "4",
    title: "Más internacional",
    value: "Viajes y Aventuras",
    description: "Miembros de 45 países",
    icon: "globe",
  },
  {
    id: "5",
    title: "Más colaborativo",
    value: "Desarrollo Web",
    description: "230 proyectos completados",
    icon: "users",
  },
]

// Datos de ejemplo para más clubes curiosos
const mockCuriousClubs2 = [
  {
    id: "6",
    title: "Más generoso",
    value: "Fotografía",
    description: "2,500 propinas enviadas",
    icon: "heart",
  },
  {
    id: "7",
    title: "Más creativo",
    value: "Arte Digital",
    description: "1,200 obras compartidas",
    icon: "palette",
  },
  {
    id: "8",
    title: "Más educativo",
    value: "Ciencia",
    description: "450 tutoriales publicados",
    icon: "book",
  },
  {
    id: "9",
    title: "Más social",
    value: "Networking",
    description: "3,200 conexiones realizadas",
    icon: "users",
  },
  {
    id: "10",
    title: "Más innovador",
    value: "Startups",
    description: "85 ideas financiadas",
    icon: "lightbulb",
  },
]

export default function SearchPage() {
  const [searchQuery, setSearchQuery] = useState("")

  return (
    <div className="container py-6">
      <div className="sticky top-0 bg-background pt-2 pb-4 z-10">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={18} />
          <Input
            placeholder="Descubre"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {!searchQuery && (
        <section className="mb-8">
          <h2 className="text-xl font-serif font-semibold mb-4">Tendencias</h2>

          {/* Tendencias de búsqueda - Grupo 1 */}
          <div className="mb-6">
            <h3 className="text-sm font-medium text-muted-foreground mb-3">Tendencias de búsqueda</h3>
            <ScrollArea className="w-full whitespace-nowrap pb-4">
              <div className="flex space-x-4">
                {mockSearchTrends.map((trend) => (
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
          </div>

          {/* Tendencias de búsqueda - Grupo 2 */}
          <div className="mb-6">
            <h3 className="text-sm font-medium text-muted-foreground mb-3">Más tendencias</h3>
            <ScrollArea className="w-full whitespace-nowrap pb-4">
              <div className="flex space-x-4">
                {mockMoreSearchTrends.map((trend) => (
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
          </div>

          {/* Clubes curiosos - Grupo 1 */}
          <div className="mb-6">
            <h3 className="text-sm font-medium text-muted-foreground mb-3">Clubes destacados</h3>
            <ScrollArea className="w-full whitespace-nowrap pb-4">
              <div className="flex space-x-4">
                {mockCuriousClubs1.map((trend) => (
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
          </div>

          {/* Clubes curiosos - Grupo 2 */}
          <div className="mb-6">
            <h3 className="text-sm font-medium text-muted-foreground mb-3">Clubes con alto rendimiento</h3>
            <ScrollArea className="w-full whitespace-nowrap pb-4">
              <div className="flex space-x-4">
                {mockCuriousClubs2.map((trend) => (
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
          </div>
        </section>
      )}

      {searchQuery && (
        <div className="flex items-center justify-center h-40 text-muted-foreground">
          Selecciona un club de las tendencias o busca uno específico
        </div>
      )}
    </div>
  )
}
