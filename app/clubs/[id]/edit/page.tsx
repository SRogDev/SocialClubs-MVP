"use client"

import { useState } from "react"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

import ClubSidebar from "@/components/club-sidebar"
import EstructuraSection from "@/components/club-edit-sections/estructura-section"
import MiembrosSection from "@/components/club-edit-sections/miembros-section"
import AutomatizarSection from "@/components/club-edit-sections/automatizar-section"
import GamificacionSection from "@/components/club-edit-sections/gamificacion-section"
import AnaliticasSection from "@/components/club-edit-sections/analiticas-section"
import AgendaSection from "@/components/club-edit-sections/agenda-section"
import MarketingSection from "@/components/club-edit-sections/marketing-section"

// Mock data — replace with real fetch later
const mockClub = {
  id: "1",
  name: "Programación",
  imageUrl: "/placeholder.svg?height=100&width=100",
  description:
    "Comunidad dedicada a compartir conocimientos y recursos sobre programación, desarrollo web y tecnologías emergentes.",
  channels: [
    { id: "1", name: "General" },
    { id: "2", name: "Proyectos" },
    { id: "3", name: "Recursos" },
    { id: "4", name: "Mentoría" },
  ],
  color: "#f97316",
}

export default function ClubEditPage({ params }: { params: { id: string } }) {
  const [activeTab, setActiveTab] = useState<
    "estructura" | "miembros" | "automatizar" | "agenda" | "gamificacion" | "analiticas" | "marketing"
  >("estructura")

  const renderActiveSection = () => {
    switch (activeTab) {
      case "estructura":
        return <EstructuraSection club={mockClub} />
      case "miembros":
        return <MiembrosSection />
      case "automatizar":
        return <AutomatizarSection channels={mockClub.channels} />
      case "agenda":
        return <AgendaSection />
      case "gamificacion":
        return <GamificacionSection />
      case "analiticas":
        return <AnaliticasSection />
      case "marketing":
        return <MarketingSection />
      default:
        return null
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      {/* Top bar */}
      <div className="container border-b py-4">
        <Link
          href={`/clubs/${params.id}/info`}
          className="group flex items-center text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft size={18} className="mr-1 transition-transform group-hover:-translate-x-1" />
          <span>Volver a información del club</span>
        </Link>
      </div>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Desktop sidebar */}
        <div className="hidden h-full w-64 md:block">
          <ClubSidebar activeTab={activeTab} onTabChange={setActiveTab} clubName={mockClub.name} />
        </div>

        {/* Main area */}
        <div className="flex-1 overflow-auto">
          {/* Mobile selector */}
          <div className="sticky top-0 z-10 border-b bg-background p-4 md:hidden">
            <select
              value={activeTab}
              onChange={(e) => setActiveTab(e.target.value as typeof activeTab)}
              className="w-full rounded-full border border-input bg-background px-3 py-2 text-sm focus:outline-none"
            >
              <option value="estructura">Estructura</option>
              <option value="miembros">Miembros</option>
              <option value="automatizar">Automatizar</option>
              <option value="agenda">Agenda</option>
              <option value="gamificacion">Gamificación</option>
              <option value="analiticas">Analíticas</option>
              <option value="marketing">Marketing</option>
            </select>
          </div>

          {renderActiveSection()}
        </div>
      </div>
    </div>
  )
}
