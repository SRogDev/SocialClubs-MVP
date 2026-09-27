"use client"

import { Palette } from "lucide-react"
import type React from "react"
import { useState, useRef, useEffect } from "react"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface ColorPickerProps {
  color: string
  onChange: (color: string) => void
  label?: string
}

const colorOptions = [
  "#f97316", // Naranja
  "#8b5cf6", // Púrpura
  "#ef4444", // Rojo
  "#10b981", // Verde
  "#3b82f6", // Azul
  "#f59e0b", // Amarillo
  "#06b6d4", // Cian
  "#84cc16", // Lima
  "#ec4899", // Rosa
  "#6366f1", // Índigo
]

export default function ColorPicker({ color, onChange, label = "Color del club" }: ColorPickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [hue, setHue] = useState(0)
  const [saturation, setSaturation] = useState(100)
  const [lightness, setLightness] = useState(50)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const hueCanvasRef = useRef<HTMLCanvasElement>(null)

  // Convertir hex a HSL
  const hexToHsl = (hex: string) => {
    const r = Number.parseInt(hex.slice(1, 3), 16) / 255
    const g = Number.parseInt(hex.slice(3, 5), 16) / 255
    const b = Number.parseInt(hex.slice(5, 7), 16) / 255

    const max = Math.max(r, g, b)
    const min = Math.min(r, g, b)
    let h = 0
    let s = 0
    const l = (max + min) / 2

    if (max !== min) {
      const d = max - min
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
      switch (max) {
        case r:
          h = (g - b) / d + (g < b ? 6 : 0)
          break
        case g:
          h = (b - r) / d + 2
          break
        case b:
          h = (r - g) / d + 4
          break
      }
      h /= 6
    }

    return [h * 360, s * 100, l * 100]
  }

  // Convertir HSL a hex
  const hslToHex = (h: number, s: number, l: number) => {
    h /= 360
    s /= 100
    l /= 100

    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1
      if (t > 1) t -= 1
      if (t < 1 / 6) return p + (q - p) * 6 * t
      if (t < 1 / 2) return q
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
      return p
    }

    let r, g, b

    if (s === 0) {
      r = g = b = l
    } else {
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s
      const p = 2 * l - q
      r = hue2rgb(p, q, h + 1 / 3)
      g = hue2rgb(p, q, h)
      b = hue2rgb(p, q, h - 1 / 3)
    }

    const toHex = (c: number) => {
      const hex = Math.round(c * 255).toString(16)
      return hex.length === 1 ? `0${  hex}` : hex
    }

    return `#${toHex(r)}${toHex(g)}${toHex(b)}`
  }

  // Inicializar valores HSL desde el color actual
  useEffect(() => {
    if (color) {
      const [h, s, l] = hexToHsl(color)
      setHue(h)
      setSaturation(s)
      setLightness(l)
    }
  }, [color])

  // Dibujar el círculo cromático
  useEffect(() => {
    const canvas = canvasRef.current
    const hueCanvas = hueCanvasRef.current
    if (!canvas || !hueCanvas) return

    const ctx = canvas.getContext("2d")
    const hueCtx = hueCanvas.getContext("2d")
    if (!ctx || !hueCtx) return

    const size = 200
    const center = size / 2
    const radius = size / 2 - 10

    // Limpiar canvas
    ctx.clearRect(0, 0, size, size)
    hueCtx.clearRect(0, 20, 20, size - 40)

    // Dibujar círculo cromático principal
    for (let angle = 0; angle < 360; angle++) {
      const startAngle = ((angle - 1) * Math.PI) / 180
      const endAngle = (angle * Math.PI) / 180

      for (let r = 0; r < radius; r++) {
        const sat = (r / radius) * 100
        const hslColor = `hsl(${angle}, ${sat}%, ${lightness}%)`

        ctx.beginPath()
        ctx.arc(center, center, r, startAngle, endAngle)
        ctx.strokeStyle = hslColor
        ctx.lineWidth = 1
        ctx.stroke()
      }
    }

    // Dibujar barra de luminosidad
    const gradient = hueCtx.createLinearGradient(0, 0, 0, size - 40)
    gradient.addColorStop(0, `hsl(${hue}, ${saturation}%, 100%)`)
    gradient.addColorStop(0.5, `hsl(${hue}, ${saturation}%, 50%)`)
    gradient.addColorStop(1, `hsl(${hue}, ${saturation}%, 0%)`)

    hueCtx.fillStyle = gradient
    hueCtx.fillRect(0, 0, 20, size - 40)
  }, [hue, saturation, lightness])

  const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top
    const center = 100

    const dx = x - center
    const dy = y - center
    const distance = Math.sqrt(dx * dx + dy * dy)
    const angle = (Math.atan2(dy, dx) * 180) / Math.PI

    if (distance <= 90) {
      const newHue = (angle + 360) % 360
      const newSaturation = Math.min((distance / 90) * 100, 100)

      setHue(newHue)
      setSaturation(newSaturation)

      const newColor = hslToHex(newHue, newSaturation, lightness)
      onChange(newColor)
    }
  }

  const handleLightnessClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = hueCanvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const y = event.clientY - rect.top
    const newLightness = Math.max(0, Math.min(100, ((160 - y) / 160) * 100))

    setLightness(newLightness)

    const newColor = hslToHex(hue, saturation, newLightness)
    onChange(newColor)
  }

  const handleHexChange = (hex: string) => {
    if (/^#[0-9A-F]{6}$/i.test(hex)) {
      onChange(hex)
    }
  }

  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-2">
        <Palette size={16} />
        {label}
      </Label>
      <div className="grid grid-cols-5 gap-3">
        {colorOptions.map((colorOption) => (
          <button
            key={colorOption}
            type="button"
            className={`w-12 h-12 rounded-full border-4 transition-all duration-200 ${
              color === colorOption
                ? "border-gray-900 dark:border-white scale-110"
                : "border-gray-200 dark:border-gray-600 hover:scale-105"
            }`}
            style={{ backgroundColor: colorOption }}
            onClick={() => onChange(colorOption)}
          />
        ))}
      </div>
      <div className="space-y-4 mt-4">
        <div className="flex items-center gap-4">
          <div
            className="w-12 h-12 rounded-lg border-2 border-gray-200 cursor-pointer transition-transform hover:scale-105 shadow-sm"
            style={{ backgroundColor: color }}
            onClick={() => setIsOpen(!isOpen)}
          />
          <div className="flex-1">
            <Label htmlFor="hex-input">Color seleccionado</Label>
            <Input
              id="hex-input"
              value={color}
              onChange={(e) => handleHexChange(e.target.value)}
              placeholder="#000000"
              className="font-mono"
            />
          </div>
        </div>

        {isOpen && (
          <div className="p-4 border rounded-lg bg-white dark:bg-gray-800 shadow-lg">
            <div className="flex gap-4 items-center justify-center">
              <div className="relative">
                <canvas
                  ref={canvasRef}
                  width={200}
                  height={200}
                  className="cursor-crosshair rounded-full"
                  onClick={handleCanvasClick}
                />
                {/* Indicador de posición actual */}
                <div
                  className="absolute w-3 h-3 border-2 border-white rounded-full pointer-events-none shadow-lg"
                  style={{
                    left: `${100 + (saturation / 100) * 90 * Math.cos((hue * Math.PI) / 180) - 6}px`,
                    top: `${100 + (saturation / 100) * 90 * Math.sin((hue * Math.PI) / 180) - 6}px`,
                  }}
                />
              </div>

              <div className="relative">
                <canvas
                  ref={hueCanvasRef}
                  width={20}
                  height={160}
                  className="cursor-pointer rounded"
                  onClick={handleLightnessClick}
                />
                {/* Indicador de luminosidad */}
                <div
                  className="absolute w-6 h-2 border-2 border-white rounded pointer-events-none shadow-lg -left-1"
                  style={{
                    top: `${160 - (lightness / 100) * 160 - 4}px`,
                  }}
                />
              </div>
            </div>

            <div className="mt-4 text-center">
              <p className="text-sm text-muted-foreground">
                HSL({Math.round(hue)}, {Math.round(saturation)}%, {Math.round(lightness)}%)
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
