'use client'

import { motion, useAnimationFrame } from 'framer-motion'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'

import { Button } from '@/components/ui/button'


// ─── Background Beams ─────────────────────────────────────────────────────────

function BackgroundBeams() {
  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <defs>
        <radialGradient id="rg1" cx="30%" cy="20%" r="60%">
          <stop offset="0%" stopColor="hsl(20 100% 50%)" stopOpacity="0.18" />
          <stop offset="100%" stopColor="transparent" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="rg2" cx="75%" cy="80%" r="55%">
          <stop offset="0%" stopColor="hsl(20 100% 55%)" stopOpacity="0.12" />
          <stop offset="100%" stopColor="transparent" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="beam1" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="hsl(20 100% 50%)" stopOpacity="0" />
          <stop offset="50%" stopColor="hsl(20 100% 50%)" stopOpacity="0.3" />
          <stop offset="100%" stopColor="hsl(20 100% 50%)" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="beam2" x1="100%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="hsl(25 100% 55%)" stopOpacity="0" />
          <stop offset="50%" stopColor="hsl(25 100% 55%)" stopOpacity="0.2" />
          <stop offset="100%" stopColor="hsl(25 100% 55%)" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Base gradients */}
      <rect width="100%" height="100%" fill="url(#rg1)" />
      <rect width="100%" height="100%" fill="url(#rg2)" />

      {/* Diagonal beams */}
      {Array.from({ length: 6 }).map((_, i) => (
        <motion.line
          key={i}
          x1={`${-10 + i * 25}%`}
          y1="0%"
          x2={`${30 + i * 25}%`}
          y2="100%"
          stroke="url(#beam1)"
          strokeWidth={i % 2 === 0 ? '1' : '0.5'}
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0.6, 0] }}
          transition={{
            duration: 4 + i * 0.8,
            delay: i * 0.7,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      ))}
      {Array.from({ length: 4 }).map((_, i) => (
        <motion.line
          key={`b${i}`}
          x1={`${100 + i * 20}%`}
          y1="0%"
          x2={`${50 + i * 20}%`}
          y2="100%"
          stroke="url(#beam2)"
          strokeWidth="0.8"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0.4, 0] }}
          transition={{
            duration: 5 + i,
            delay: 2 + i * 0.9,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      ))}
    </svg>
  )
}

// ─── Text Generate Effect ─────────────────────────────────────────────────────

function TextGenerate({ text, className }: { text: string; className?: string }) {
  const words = text.split(' ')

  return (
    <span className={className}>
      {words.map((word, wi) => (
        <motion.span
          key={wi}
          initial={{ opacity: 0, filter: 'blur(8px)', y: 12 }}
          animate={{ opacity: 1, filter: 'blur(0px)', y: 0 }}
          transition={{ duration: 0.5, delay: 0.8 + wi * 0.09, ease: 'easeOut' }}
          className="inline-block mr-[0.25em]"
        >
          {word}
        </motion.span>
      ))}
    </span>
  )
}

// ─── Floating Particles ───────────────────────────────────────────────────────

interface Particle {
  id: number
  x: number
  y: number
  size: number
  vx: number
  vy: number
  opacity: number
}

function FloatingParticles() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const particlesRef = useRef<Particle[]>([])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const resize = () => {
      canvas.width = canvas.offsetWidth
      canvas.height = canvas.offsetHeight
    }
    resize()
    window.addEventListener('resize', resize)

    particlesRef.current = Array.from({ length: 35 }, (_, i) => ({
      id: i,
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      size: Math.random() * 2.5 + 0.5,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      opacity: Math.random() * 0.5 + 0.1,
    }))

    let raf: number
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      for (const p of particlesRef.current) {
        p.x += p.vx
        p.y += p.vy
        if (p.x < 0) p.x = canvas.width
        if (p.x > canvas.width) p.x = 0
        if (p.y < 0) p.y = canvas.height
        if (p.y > canvas.height) p.y = 0

        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx.fillStyle = `hsla(20, 100%, 55%, ${p.opacity})`
        ctx.fill()
      }
      raf = requestAnimationFrame(draw)
    }
    draw()

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
      aria-hidden
    />
  )
}

// ─── Hero Section ─────────────────────────────────────────────────────────────

export function HeroSection() {
  return (
    <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden py-20">
      {/* Background layers */}
      <BackgroundBeams />
      <FloatingParticles />

      {/* Radial glow centre */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 70% 50% at 50% 50%, hsl(20 100% 50% / 0.07) 0%, transparent 70%)',
        }}
      />

      {/* Content */}
      <div className="container mx-auto px-4 text-center relative z-10">
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 bg-primary/10 border border-primary/25 text-primary
                     px-4 py-1.5 rounded-full text-sm font-medium mb-8"
        >
          <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          La plataforma de comunidades del futuro
        </motion.div>

        {/* Main heading */}
        <motion.h1
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="text-5xl md:text-7xl lg:text-8xl font-black mb-6 leading-none tracking-tight"
        >
          <TextGenerate
            text="Todo el Poder"
            className="block bg-gradient-to-r from-primary via-orange-400 to-yellow-400 bg-clip-text text-transparent"
          />
          <TextGenerate
            text="para Crear"
            className="block text-foreground"
          />
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 1.4 }}
          className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed"
        >
          Crea tu club privado, gamifica tu comunidad, monetiza tu conocimiento
          y conecta con tus miembros en un solo lugar.
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 1.7 }}
          className="flex flex-col sm:flex-row gap-4 justify-center items-center"
        >
          <Link href="/auth/sign-up">
            <Button
              size="lg"
              className="relative px-8 py-6 text-base font-semibold overflow-hidden group"
              style={{
                background: 'hsl(20 100% 50%)',
                boxShadow: '0 0 24px hsl(20 100% 50% / 0.5), 0 4px 12px rgba(0,0,0,0.15)',
              }}
            >
              <span className="relative z-10">Crea tu Club Gratis</span>
              {/* Shimmer */}
              <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700
                               bg-gradient-to-r from-transparent via-white/20 to-transparent" />
            </Button>
          </Link>
          <Link href="/explore">
            <Button
              variant="outline"
              size="lg"
              className="px-8 py-6 text-base font-semibold border-primary/30 hover:border-primary hover:bg-primary/5"
            >
              Explorar Clubs
            </Button>
          </Link>
        </motion.div>

        {/* Social proof */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 2 }}
          className="mt-8 text-sm text-muted-foreground"
        >
          +2,000 creadores ya construyen su comunidad aquí
        </motion.p>
      </div>
    </section>
  )
}
