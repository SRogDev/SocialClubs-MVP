"use client"
import { motion } from "framer-motion"
import ClubCard from "@/components/club-card"
import CreateClubLink from "@/components/create-club-link"

const mockClubs = [
  {
    id: "1",
    name: "Programación",
    image: "/placeholder.svg?height=60&width=60",
    color: "#f97316",
    members: 1250,
    level: 8,
    lastContent: {
      type: "text",
      preview: "¿Alguien sabe cómo optimizar esta consulta SQL?",
      time: "2m",
    },
  },
  {
    id: "2",
    name: "Fotografía",
    image: "/placeholder.svg?height=60&width=60",
    color: "#8b5cf6",
    members: 890,
    level: 10,
    lastContent: {
      type: "image",
      preview: "Compartió una nueva foto del atardecer",
      time: "15m",
    },
  },
  {
    id: "3",
    name: "Fitness",
    image: "/placeholder.svg?height=60&width=60",
    color: "#10b981",
    members: 2100,
    level: 6,
    lastContent: {
      type: "video",
      preview: "Rutina de ejercicios para principiantes",
      time: "1h",
    },
  },
  {
    id: "4",
    name: "Cocina",
    image: "/placeholder.svg?height=60&width=60",
    color: "#ef4444",
    members: 567,
    level: 3,
    lastContent: {
      type: "text",
      preview: "Receta de pasta carbonara auténtica italiana",
      time: "3h",
    },
  },
]

export default function ClubsPage() {
  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="container max-w-2xl mx-auto py-6">
        <div className="space-y-3 mb-6">
          {mockClubs.map((club, index) => (
            <motion.div
              key={club.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
            >
              <ClubCard club={club} />
            </motion.div>
          ))}
        </div>

        <div className="pt-4">
          <CreateClubLink />
        </div>
      </div>
    </div>
  )
}
