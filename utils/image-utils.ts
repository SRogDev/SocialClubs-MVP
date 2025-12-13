// Función para generar un placeholder de color sólido
export function generateColorPlaceholder(width: number, height: number, color: string): string {
  return `data:image/svg+xml;charset=utf-8,<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="100%" height="100%" fill="${color}" opacity="0.5"/></svg>`
}

// Función para generar un color basado en un string
export function generateColorFromString(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash)
  }
  const color = Math.floor(Math.abs((Math.sin(hash) * 16777215) % 16777215))
  return `#${color.toString(16).padStart(6, "0")}`
}

// Función para optimizar la URL de una imagen
export function optimizeImageUrl(url: string, width?: number, height?: number, quality = 80): string {
  // Si es una URL de placeholder, devolver tal cual
  if (url.includes("placeholder.svg")) {
    return url
  }

  // Si es una URL externa, intentar usar un servicio de optimización de imágenes
  if (url.startsWith("http") && !url.includes(window.location.hostname)) {
    // Ejemplo con Imgix (en producción, usarías tu propio servicio)
    // return `https://images.weserv.nl/?url=${encodeURIComponent(url)}&w=${width || ''}&h=${height || ''}&q=${quality}&fit=cover`

    // Por ahora, devolver la URL original
    return url
  }

  // Si es una URL local y estamos usando Next.js, podemos usar la API de optimización de imágenes
  if (width && height) {
    // Añadir parámetros para la API de Next.js Image
    const separator = url.includes("?") ? "&" : "?"
    return `${url}${separator}w=${width}&h=${height}&q=${quality}`
  }

  return url
}

// Función para precargar imágenes críticas
export function preloadCriticalImages(urls: string[]): void {
  if (typeof window === "undefined") return

  urls.forEach((url) => {
    const link = document.createElement("link")
    link.rel = "preload"
    link.as = "image"
    link.href = url
    document.head.appendChild(link)
  })
}
