"use client"

import { useEffect } from "react"
import { usePathname, useSearchParams } from "next/navigation"
import { reportWebVitals, measurePerformance, optimizeResourceLoading } from "@/utils/performance"

export default function Analytics() {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // Seguimiento de cambios de página
  useEffect(() => {
    const url = pathname + (searchParams?.toString() ? `?${searchParams.toString()}` : "")

    // Medir el tiempo de carga de la página
    measurePerformance(`page_view_${pathname}`)

    // Registrar la vista de página (en producción, esto enviaría datos a un servicio de análisis)
    console.log(`[Analytics] Page view: ${url}`)

    // Optimizar la carga de recursos
    const cleanup = optimizeResourceLoading()

    return () => {
      if (cleanup) cleanup()
    }
  }, [pathname, searchParams])

  // Reportar Web Vitals cuando estén disponibles
  useEffect(() => {
    if (typeof window !== "undefined" && "performance" in window) {
      // Observar métricas de Web Vitals
      if ("PerformanceObserver" in window) {
        try {
          const observer = new PerformanceObserver((list) => {
            list.getEntries().forEach((entry) => {
              // Reportar métricas
              reportWebVitals({
                name: entry.name,
                value: entry.startTime,
                rating: "good", // Esto debería calcularse basado en umbrales
              })
            })
          })

          // Observar métricas de FID
          observer.observe({ type: "first-input", buffered: true })

          return () => {
            observer.disconnect()
          }
        } catch (error) {
          console.error("Error setting up PerformanceObserver:", error)
        }
      }
    }
  }, [])

  return null
}
