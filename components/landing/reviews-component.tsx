"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"

const reviews = [
  {
    id: 1,
    name: "María González",
    avatar: "/placeholder.svg?height=40&width=40",
    review:
      "SocialClubs ha transformado completamente cómo gestiono mi comunidad. La gamificación mantiene a todos comprometidos.",
  },
  {
    id: 2,
    name: "Carlos Rodríguez",
    avatar: "/placeholder.svg?height=40&width=40",
    review: "Las tareas personalizadas y el sistema de recompensas han aumentado la participación en un 300%.",
  },
  {
    id: 3,
    name: "Ana Martínez",
    avatar: "/placeholder.svg?height=40&width=40",
    review: "Increíble plataforma. Los analytics me ayudan a entender mejor a mi comunidad.",
  },
  {
    id: 4,
    name: "Luis Fernández",
    avatar: "/placeholder.svg?height=40&width=40",
    review: "Fácil de usar y muy completa. Mis miembros están más activos que nunca.",
  },
  {
    id: 5,
    name: "Sofia López",
    avatar: "/placeholder.svg?height=40&width=40",
    review: "El mejor sistema de gestión de comunidades que he usado. Altamente recomendado.",
  },
]

export function ReviewsComponent() {
  const [currentIndex, setCurrentIndex] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % reviews.length)
    }, 3000)

    return () => clearInterval(interval)
  }, [])

  return (
    <section className="py-12 md:py-20">
      <div className="container mx-auto px-4">
        <h2 className="text-2xl md:text-3xl font-bold text-center mb-8 text-foreground">
          Lo que dicen nuestros usuarios
        </h2>

        <div className="max-w-2xl mx-auto">
          <div className="relative h-48 md:h-40">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentIndex}
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                transition={{ duration: 0.5, ease: "easeInOut" }}
                className="absolute inset-0"
              >
                <Card className="h-full">
                  <CardContent className="p-6 h-full flex items-center">
                    <div className="flex items-start space-x-4 w-full">
                      <Avatar className="h-12 w-12 flex-shrink-0">
                        <AvatarImage src={reviews[currentIndex].avatar || "/placeholder.svg"} />
                        <AvatarFallback className="bg-primary/20 text-primary">
                          {reviews[currentIndex].name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold mb-2 text-foreground">{reviews[currentIndex].name}</h4>
                        <p className="text-muted-foreground leading-relaxed">{reviews[currentIndex].review}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Progress Indicators */}
          <div className="flex justify-center space-x-2 mt-6">
            {reviews.map((_, index) => (
              <button
                key={index}
                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  index === currentIndex ? "bg-primary w-8" : "bg-muted hover:bg-primary/50"
                }`}
                onClick={() => setCurrentIndex(index)}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
