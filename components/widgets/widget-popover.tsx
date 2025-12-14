"use client"

import type React from "react"

import { useRef, useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Brain, Dices, Sparkles, Compass, Link2 } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import MagicLinkModal from "@/components/post/magic-link-modal"

interface WidgetPopoverProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  triggerRef: React.RefObject<HTMLButtonElement>
}

export default function WidgetPopover({ open, onOpenChange, triggerRef }: WidgetPopoverProps) {
  const popoverRef = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState({ top: 0, left: 0 })
  const [showMagicLinkModal, setShowMagicLinkModal] = useState(false)

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

  const handleMagicLinkClick = () => {
    onOpenChange(false)
    setShowMagicLinkModal(true)
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
              <Button
                variant="outline"
                className="flex flex-col items-center justify-center h-24 p-2 hover:scale-105 transition-all aspect-square"
                onClick={() => console.log("Widget Meta seleccionado")}
              >
                <Brain size={24} className="mb-2 text-primary" />
                <span className="text-xs text-center">Meta</span>
              </Button>

              <Button
                variant="outline"
                className="flex flex-col items-center justify-center h-24 p-2 hover:scale-105 transition-all aspect-square"
                onClick={() => console.log("Widget Rueda seleccionado")}
              >
                <Compass size={24} className="mb-2 text-primary" />
                <span className="text-xs text-center">Rueda</span>
              </Button>

              <Button
                variant="outline"
                className="flex flex-col items-center justify-center h-24 p-2 hover:scale-105 transition-all aspect-square"
                onClick={() => console.log("Widget Mural seleccionado")}
              >
                <Dices size={24} className="mb-2 text-primary" />
                <span className="text-xs text-center">Mural</span>
              </Button>

              <Button
                variant="outline"
                className="flex flex-col items-center justify-center h-24 p-2 hover:scale-105 transition-all aspect-square"
                onClick={() => console.log("Widget Sorpresa seleccionado")}
              >
                <Sparkles size={24} className="mb-2 text-primary" />
                <span className="text-xs text-center">Sorpresa</span>
              </Button>

              <Button
                variant="outline"
                className="flex flex-col items-center justify-center h-24 p-2 hover:scale-105 transition-all aspect-square col-span-2"
                onClick={handleMagicLinkClick}
              >
                <Link2 size={24} className="mb-2 text-primary group-hover:rotate-45 transition-transform" />
                <span className="text-xs text-center">Magic Link</span>
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <MagicLinkModal open={showMagicLinkModal} onOpenChange={setShowMagicLinkModal} />
    </>
  )
}
