"use client"

import type React from "react"

import { useRouter } from "next/navigation"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function CreateClubLink() {
  const router = useRouter()

  const handleCreateClub = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    router.push("/clubs/create")
  }

  return (
    <Button
      onClick={handleCreateClub}
      className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-medium py-4 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 group relative overflow-hidden"
    >
      {/* Efecto de brillo */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />

      {/* Contenido del botón */}
      <div className="flex items-center justify-center gap-2 relative z-10">
        <Plus size={20} className="group-hover:rotate-90 transition-transform duration-300" />
        <span className="text-lg">Crear Club</span>
      </div>

      {/* Borde brillante */}
      <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-orange-400 to-orange-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10 blur-sm" />
    </Button>
  )
}
