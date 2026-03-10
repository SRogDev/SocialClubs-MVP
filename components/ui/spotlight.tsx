'use client'

import { useRef, useState, useCallback, useEffect } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface SpotlightProps {
  children: React.ReactNode
  className?: string
  /** Spotlight radius in px. Default 300 */
  radius?: number
  /** Spotlight color. Default electric orange */
  color?: string
}

/**
 * Spotlight Effect – follows mouse cursor with an electric orange radial glow.
 * Wrap a section or container with this to get the Aceternity spotlight.
 */
export function Spotlight({ children, className, radius = 300, color = 'hsl(20 100% 50%)' }: SpotlightProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null)
  const [isVisible, setIsVisible] = useState(false)

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    setPosition({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    })
  }, [])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    el.addEventListener('mousemove', handleMouseMove)
    el.addEventListener('mouseenter', () => setIsVisible(true))
    el.addEventListener('mouseleave', () => setIsVisible(false))
    return () => {
      el.removeEventListener('mousemove', handleMouseMove)
      el.removeEventListener('mouseenter', () => setIsVisible(true))
      el.removeEventListener('mouseleave', () => setIsVisible(false))
    }
  }, [handleMouseMove])

  return (
    <div ref={containerRef} className={cn('relative overflow-hidden', className)}>
      {/* Spotlight gradient */}
      {position && (
        <motion.div
          className="pointer-events-none absolute -inset-px z-0"
          animate={{
            opacity: isVisible ? 1 : 0,
            background: `radial-gradient(${radius}px circle at ${position.x}px ${position.y}px, ${color}15 0%, transparent 65%)`,
          }}
          transition={{ duration: 0.15 }}
        />
      )}
      {/* Content */}
      <div className="relative z-10">{children}</div>
    </div>
  )
}

/**
 * SpotlightCard – a single card that glows with a spotlight on hover.
 */
export function SpotlightCard({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  const cardRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState({ x: 0, y: 0 })
  const [hovered, setHovered] = useState(false)

  return (
    <div
      ref={cardRef}
      onMouseMove={(e) => {
        const rect = cardRef.current!.getBoundingClientRect()
        setPos({ x: e.clientX - rect.left, y: e.clientY - rect.top })
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={cn('relative overflow-hidden rounded-2xl', className)}
    >
      <motion.div
        className="pointer-events-none absolute inset-0 z-10 rounded-2xl"
        animate={{
          opacity: hovered ? 1 : 0,
          background: `radial-gradient(200px circle at ${pos.x}px ${pos.y}px, hsl(20 100% 50% / 0.12) 0%, transparent 70%)`,
        }}
        transition={{ duration: 0.1 }}
      />
      {children}
    </div>
  )
}
