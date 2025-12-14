"use client"

import type React from "react"

import { useRef, useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Brain, Dices, Sparkles, Compass, Link2 } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import WidgetModal from "@/components/widgets/widget-modal"

interface AllWidgetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  triggerRef: React.RefObject<HTMLButtonElement>
}

// Definición de los widgets disponibles
export const availableWidgets = [
  {
    id: "meta",
    name: "Meta",
    icon: Brain,
    description: "Comparte ideas y conceptos abstractos",
    isFree: true,
    modalConfig: {
      title: "Crear widget Meta",
      fields: [
        {
          id: "title",
          label: "Título",
          type: "text",
          placeholder: "Título de tu meta",
        },
        {
          id: "content",
          label: "Contenido",
          type: "textarea",
          placeholder: "Describe tu meta o concepto...",
        },
      ],
      submitLabel: "Publicar Meta",
    },
  },
  {
    id: "wheel",
    name: "Rueda",
    icon: Compass,
    description: "Crea una rueda de opciones interactiva",
    isFree: true,
    modalConfig: {
      title: "Crear widget Rueda",
      fields: [
        {
          id: "title",
          label: "Título",
          type: "text",
          placeholder: "Título de tu rueda",
        },
        {
          id: "options",
          label: "Opciones (separadas por coma)",
          type: "text",
          placeholder: "Opción 1, Opción 2, Opción 3...",
        },
      ],
      submitLabel: "Crear Rueda",
    },
  },
  {
    id: "mural",
    name: "Mural",
    icon: Dices,
    description: "Comparte un mural colaborativo",
    isFree: true,
    modalConfig: {
      title: "Crear widget Mural",
      fields: [
        {
          id: "title",
          label: "Título",
          type: "text",
          placeholder: "Título de tu mural",
        },
        {
          id: "description",
          label: "Descripción",
          type: "textarea",
          placeholder: "Describe el propósito de este mural...",
        },
      ],
      submitLabel: "Crear Mural",
    },
  },
  {
    id: "surprise",
    name: "Sorpresa",
    icon: Sparkles,
    description: "Genera contenido sorpresa para tu comunidad",
    isFree: true,
    modalConfig: {
      title: "Crear widget Sorpresa",
      fields: [
        {
          id: "title",
          label: "Título",
          type: "text",
          placeholder: "Título de tu sorpresa",
        },
        {
          id: "hint",
          label: "Pista (opcional)",
          type: "text",
          placeholder: "Da una pista sobre la sorpresa...",
        },
      ],
      submitLabel: "Crear Sorpresa",
    },
  },
  {
    id: "magic-link",
    name: "Magic Link",
    icon: Link2,
    description: "Comparte enlaces de forma atractiva",
    isFree: true,
    modalConfig: {
      title: "Crear Magic Link",
      fields: [
        {
          id: "title",
          label: "Título",
          type: "text",
          placeholder: "Título de tu enlace",
        },
        {
          id: "url",
          label: "URL",
          type: "text",
          placeholder: "https://ejemplo.com",
        },
      ],
      submitLabel: "Publicar",
    },
  },
]

export default function AllWidget({ open, onOpenChange, triggerRef }: AllWidgetProps) {
  const popoverRef = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState({ top: 0, left: 0 })
  const [selectedWidget, setSelectedWidget] = useState<string | null>(null)

  // Calcular la posición del popover basado en el botón que lo activa
  useEffect(() => {
    if (triggerRef.current && open) {
      const rect = triggerRef.current.getBoundingClientRect()
      setPosition({
        top: rect.top + window.scrollY - 180, // Posicionado más arriba en el eje Y
        left: rect.right + window.scrollX + 5, // 5px a la derecha del botón
      })
    }
  }, [open, triggerRef])

  // Cerrar el popover al hacer clic fuera de él
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(event.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        onOpenChange(false)
      }
    }

    if (open) {
      document.addEventListener("mousedown", handleClickOutside)
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [open, onOpenChange, triggerRef])

  const handleWidgetClick = (widgetId: string) => {
    onOpenChange(false)
    setSelectedWidget(widgetId)
  }

  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.div
            ref={popoverRef}
            className="absolute z-50 bg-background rounded-lg border shadow-lg p-4 w-64"
            style={{ top: position.top, left: position.left }}
            initial={{ opacity: 0, scale: 0.9, x: -20 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.9, x: -20 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            <div className="grid grid-cols-2 gap-3">
              {availableWidgets.slice(0, 4).map((widget) => (
                <Button
                  key={widget.id}
                  variant="outline"
                  className="flex flex-col items-center justify-center h-24 p-2 hover:scale-105 transition-all aspect-square"
                  onClick={() => handleWidgetClick(widget.id)}
                >
                  <widget.icon size={24} className="mb-2 text-primary" />
                  <span className="text-xs text-center">{widget.name}</span>
                </Button>
              ))}

              <Button
                variant="outline"
                className="flex flex-col items-center justify-center h-24 p-2 hover:scale-105 transition-all aspect-square col-span-2"
                onClick={() => handleWidgetClick("magic-link")}
              >
                <Link2 size={24} className="mb-2 text-primary group-hover:rotate-45 transition-transform" />
                <span className="text-xs text-center">Magic Link</span>
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {selectedWidget && (
        <WidgetModal open={!!selectedWidget} onOpenChange={() => setSelectedWidget(null)} widgetType={selectedWidget} />
      )}
    </>
  )
}
