// Función para medir el rendimiento de la aplicación
export function measurePerformance(metricName: string) {
  if (typeof window !== "undefined" && "performance" in window) {
    const now = performance.now()

    // Registrar la métrica en la consola (en producción, esto podría enviarse a un servicio de análisis)
    console.log(`[Performance] ${metricName}: ${now.toFixed(2)}ms`)

    // Si está disponible, usar la API de Web Vitals
    if ("PerformanceObserver" in window) {
      try {
        // Registrar la métrica personalizada
        performance.mark(metricName)
      } catch (error) {
        console.error(`Error registrando métrica ${metricName}:`, error)
      }
    }

    return now
  }

  return 0
}

// Función para optimizar la carga de recursos
export function optimizeResourceLoading() {
  if (typeof window !== "undefined") {
    // Precargar recursos críticos
    const preloadResources = () => {
      const criticalPaths = ["/explore", "/clubs", "/profile"]

      // Precargar rutas críticas
      criticalPaths.forEach((path) => {
        const link = document.createElement("link")
        link.rel = "prefetch"
        link.href = path
        document.head.appendChild(link)
      })
    }

    // Ejecutar después de que la página haya cargado
    if (document.readyState === "complete") {
      preloadResources()
    } else {
      window.addEventListener("load", preloadResources)
    }

    return () => {
      window.removeEventListener("load", preloadResources)
    }
  }
}

// Función para reportar Web Vitals
export function reportWebVitals(metric: any) {
  // En producción, esto enviaría los datos a un servicio de análisis
  console.log(`[Web Vital] ${metric.name}: ${metric.value}`)

  // Ejemplo de envío a un endpoint de análisis
  // fetch('/api/analytics', {
  //   method: 'POST',
  //   body: JSON.stringify(metric),
  //   headers: { 'Content-Type': 'application/json' }
  // })
}
