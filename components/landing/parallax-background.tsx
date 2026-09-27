'use client'

import { motion, useScroll, useTransform, useSpring } from 'framer-motion'
import { useRef, useEffect } from 'react'

interface Blob {
  id: number
  x: string
  y: string
  w: string
  h: string
  opacity: number
  blur: string
  color: string
  duration: number
  delay: number
}

const BLOBS: Blob[] = [
  { id: 1, x: '-10%', y: '-15%', w: '45vw', h: '45vw', opacity: 0.18, blur: '80px', color: '#FF5500', duration: 18, delay: 0 },
  { id: 2, x: '60%', y: '5%', w: '38vw', h: '38vw', opacity: 0.12, blur: '100px', color: '#FF7733', duration: 22, delay: 3 },
  { id: 3, x: '20%', y: '55%', w: '50vw', h: '30vw', opacity: 0.1, blur: '90px', color: '#FF3300', duration: 25, delay: 6 },
  { id: 4, x: '-5%', y: '70%', w: '30vw', h: '30vw', opacity: 0.14, blur: '70px', color: '#FF6600', duration: 20, delay: 2 },
  { id: 5, x: '75%', y: '60%', w: '28vw', h: '28vw', opacity: 0.09, blur: '110px', color: '#FF4400', duration: 28, delay: 8 },
]

function AnimatedBlob({ blob }: { blob: Blob }) {
  return (
    <motion.div
      className="absolute rounded-full pointer-events-none"
      style={{
        left: blob.x,
        top: blob.y,
        width: blob.w,
        height: blob.h,
        background: blob.color,
        opacity: blob.opacity,
        filter: `blur(${blob.blur})`,
        willChange: 'transform',
      }}
      animate={{
        x: [0, 30, -20, 15, 0],
        y: [0, -25, 20, -10, 0],
        scale: [1, 1.08, 0.95, 1.04, 1],
      }}
      transition={{
        duration: blob.duration,
        delay: blob.delay,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
    />
  )
}

interface ParallaxLayerProps {
  children: React.ReactNode
  speed?: number
  className?: string
}

export function ParallaxLayer({ children, speed = 1, className }: ParallaxLayerProps) {
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll()
  const rawY = useTransform(scrollYProgress, [0, 1], [0, speed * -200])
  const y = useSpring(rawY, { stiffness: 60, damping: 20 })

  return (
    <motion.div ref={ref} style={{ y }} className={className}>
      {children}
    </motion.div>
  )
}

interface ParallaxBackgroundProps {
  children: React.ReactNode
  className?: string
  /** Show subtle grid overlay */
  grid?: boolean
}

/**
 * Full-page parallax background.
 * Layer 1 (blobs at 0.1–0.3x scroll speed) — slow electric orange blobs
 * Layer 2 (content at 1x)                  — normal page content via children
 *
 * Usage: wrap entire page content inside <ParallaxBackground>
 */
export function ParallaxBackground({ children, className = '', grid = true }: ParallaxBackgroundProps) {
  return (
    <div className={`relative overflow-hidden ${className}`}>
      {/* ── Layer 1: slow blobs (0.1–0.3x) ─────────────────────── */}
      <div className="fixed inset-0 pointer-events-none -z-10" aria-hidden>
        {BLOBS.map((blob) => (
          <AnimatedBlob key={blob.id} blob={blob} />
        ))}

        {/* Noise grain overlay for texture */}
        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
            backgroundSize: '200px 200px',
          }}
        />

        {/* Optional subtle grid */}
        {grid && (
          <div
            className="absolute inset-0 opacity-[0.03] dark:opacity-[0.06]"
            style={{
              backgroundImage:
                'linear-gradient(hsl(20 100% 50%) 1px, transparent 1px), linear-gradient(90deg, hsl(20 100% 50%) 1px, transparent 1px)',
              backgroundSize: '64px 64px',
            }}
          />
        )}
      </div>

      {/* ── Layer 2: main content (1x) ────────────────────────────── */}
      <div className="relative z-0">{children}</div>
    </div>
  )
}
