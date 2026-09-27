"use client"

import { Plus } from "lucide-react"
import { useRouter } from "next/navigation"
import type React from "react"


import { Button } from "@/components/ui/button"

export default function CreateClubButton() {
  const router = useRouter()

  const handleCreateClub = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    router.push("/clubs/create")
  }

  return (
    <Button
      onClick={handleCreateClub}
      variant="ghost"
      className="flex items-center justify-center p-3 text-orange-500 dark:text-orange-400 hover:text-orange-600 dark:hover:text-orange-300 hover:bg-orange-50 dark:hover:bg-orange-950/20 transition-all duration-300 group w-full"
    >
      <Plus size={18} className="mr-2 group-hover:rotate-90 transition-transform duration-300" />
      <span className="font-medium">Crear Club</span>
    </Button>
  )
}
