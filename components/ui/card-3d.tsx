'use client'

import { useRef, useState } from 'react'
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion'
import { cn } from '@/lib/utils'

interface Card3DProps {
  children: React.ReactNode
  className?: string
  /** Intensity of the 3D tilt effect (degrees). Default: 12 */
  intensity?: number
  /** Show electric orange glow on hover */
  glow?: boolean
}

/**
 * 3D Card Hover – Aceternity-style perspective tilt with optional glow.
 * Wrap any card content inside this component.
 */
export function Card3D({ children, className, intensity = 12, glow = true }: Card3DProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [isHovered, setIsHovered] = useState(false)

  const x = useMotionValue(0)
  const y = useMotionValue(0)

  const xSpring = useSpring(x, { stiffness: 180, damping: 22 })
  const ySpring = useSpring(y, { stiffness: 180, damping: 22 })

  const rotateX = useTransform(ySpring, [-0.5, 0.5], [intensity, -intensity])
  const rotateY = useTransform(xSpring, [-0.5, 0.5], [-intensity, intensity])

  // Shine position
  const shineX = useTransform(xSpring, [-0.5, 0.5], ['0%', '100%'])
  const shineY = useTransform(ySpring, [-0.5, 0.5], ['0%', '100%'])

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    if (!ref.current) return
    const rect = ref.current.getBoundingClientRect()
    x.set((e.clientX - rect.left) / rect.width - 0.5)
    y.set((e.clientY - rect.top) / rect.height - 0.5)
  }

  function handleMouseLeave() {
    x.set(0)
    y.set(0)
    setIsHovered(false)
  }

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
      style={{
        rotateX,
        rotateY,
        transformStyle: 'preserve-3d',
        perspective: 800,
      }}
      className={cn('relative cursor-pointer', className)}
    >
      {/* Card body */}
      <div
        className="relative rounded-2xl overflow-hidden transition-shadow duration-300"
        style={{
          boxShadow: isHovered && glow
            ? '0 0 32px hsl(20 100% 50% / 0.25), 0 16px 40px rgba(0,0,0,0.15)'
            : '0 4px 16px rgba(0,0,0,0.06)',
          transform: 'translateZ(0)',
        }}
      >
        {children}

        {/* Shine overlay */}
        <motion.div
          className="absolute inset-0 pointer-events-none opacity-0 transition-opacity duration-200 rounded-2xl"
          style={{
            background: `radial-gradient(circle at ${shineX} ${shineY}, rgba(255,255,255,0.15) 0%, transparent 60%)`,
            opacity: isHovered ? 1 : 0,
          }}
        />
      </div>

      {/* Glow border */}
      {glow && (
        <motion.div
          className="absolute inset-0 rounded-2xl pointer-events-none"
          style={{
            border: '1px solid transparent',
            background: `linear-gradient(var(--card), var(--card)) padding-box,
                         linear-gradient(135deg, hsl(20 100% 50% / 0.5), transparent 40%, hsl(25 100% 55% / 0.3)) border-box`,
            opacity: isHovered ? 1 : 0,
            transition: 'opacity 0.25s',
          }}
        />
      )}
    </motion.div>
  )
}
