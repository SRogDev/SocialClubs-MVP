"use client"

import type React from "react"

import { useState, useEffect } from "react"
import Image from "next/image"
import { cn } from "@/lib/utils"

interface OptimizedImageProps {
  src: string
  alt: string
  width?: number
  height?: number
  priority?: boolean
  className?: string
  fill?: boolean
  sizes?: string
  quality?: number
  onLoad?: () => void
}

export default function OptimizedImage({
  src,
  alt,
  width,
  height,
  priority = false,
  className,
  fill = false,
  sizes = "100vw",
  quality = 80,
  onLoad,
  ...props
}: OptimizedImageProps &
  Omit<React.ComponentProps<typeof Image>, "src" | "alt" | "width" | "height" | "fill" | "sizes">) {
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(false)
  const [blurDataURL, setBlurDataURL] = useState<string | undefined>(undefined)

  // Generar un placeholder de color sólido basado en el src
  useEffect(() => {
    // Función simple para generar un color basado en el string de src
    const generateColorFromString = (str: string) => {
      let hash = 0
      for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash)
      }
      const color = Math.floor(Math.abs((Math.sin(hash) * 16777215) % 16777215))
      return `#${color.toString(16).padStart(6, "0")}`
    }

    // Solo generar placeholder si no es una imagen prioritaria
    if (!priority) {
      const color = generateColorFromString(src)
      setBlurDataURL(
        `data:image/svg+xml;charset=utf-8,<svg xmlns="http://www.w3.org/2000/svg" width="${width || 100}" height="${height || 100}" viewBox="0 0 ${width || 100} ${height || 100}"><rect width="100%" height="100%" fill="${color}" opacity="0.5"/></svg>`,
      )
    }
  }, [src, width, height, priority])

  const handleLoad = () => {
    setIsLoading(false)
    if (onLoad) onLoad()
  }

  const handleError = () => {
    setError(true)
    setIsLoading(false)
  }

  // Fallback para imágenes que fallan en cargar
  if (error) {
    return (
      <div
        className={cn("bg-muted flex items-center justify-center text-muted-foreground", className)}
        style={{ width: width ? `${width}px` : "100%", height: height ? `${height}px` : "100%" }}
        {...props}
      >
        <span className="text-xs">Error al cargar imagen</span>
      </div>
    )
  }

  return (
    <div className={cn("relative overflow-hidden", className)} {...props}>
      <Image
        src={src || "/placeholder.svg"}
        alt={alt}
        width={fill ? undefined : width}
        height={fill ? undefined : height}
        className={cn("transition-opacity duration-300", isLoading ? "opacity-0" : "opacity-100")}
        fill={fill}
        sizes={sizes}
        quality={quality}
        priority={priority}
        loading={priority ? "eager" : "lazy"}
        onLoad={handleLoad}
        onError={handleError}
        placeholder={blurDataURL ? "blur" : "empty"}
        blurDataURL={blurDataURL}
      />
      {isLoading && <div className="absolute inset-0 bg-muted/30 animate-pulse" />}
    </div>
  )
}
