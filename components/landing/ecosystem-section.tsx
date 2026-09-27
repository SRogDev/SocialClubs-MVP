'use client'

import { motion, useAnimationFrame } from 'framer-motion'
import { useRef } from 'react'

const SOCIAL_NETWORKS = [
  { name: 'Instagram', icon: '📸', bgFrom: '#E1306C', bgTo: '#833AB4' },
  { name: 'YouTube', icon: '▶', bgFrom: '#FF0000', bgTo: '#CC0000' },
  { name: 'Discord', icon: '💬', bgFrom: '#5865F2', bgTo: '#4752c4' },
  { name: 'Telegram', icon: '✈', bgFrom: '#0088cc', bgTo: '#006699' },
  { name: 'TikTok', icon: '🎵', bgFrom: '#111', bgTo: '#333' },
  { name: 'X', icon: '𝕏', bgFrom: '#222', bgTo: '#444' },
]

interface OrbitIconProps {
  name: string
  icon: string
  bgFrom: string
  bgTo: string
  radius: number
  speed: number
  startAngle: number
}

function OrbitIcon({ name, icon, bgFrom, bgTo, radius, speed, startAngle }: OrbitIconProps) {
  const angleRef = useRef(startAngle)
  const itemRef = useRef<HTMLDivElement>(null)

  useAnimationFrame((_, delta) => {
    angleRef.current += (speed * delta) / 1000
    const x = Math.cos(angleRef.current) * radius
    const y = Math.sin(angleRef.current) * radius * 0.38
    if (itemRef.current) {
      itemRef.current.style.transform = `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`
    }
  })

  return (
    <div
      ref={itemRef}
      className="absolute left-1/2 top-1/2 cursor-default group"
      style={{ willChange: 'transform' }}
    >
      <div
        className="w-11 h-11 md:w-13 md:h-13 rounded-xl flex items-center justify-center text-lg shadow-lg
                   transition-transform duration-200 group-hover:scale-115 select-none"
        style={{
          background: `linear-gradient(135deg, ${bgFrom}, ${bgTo})`,
          boxShadow: `0 4px 18px ${bgFrom}55`,
        }}
      >
        {icon}
      </div>
      {/* tooltip */}
      <div className="absolute -bottom-7 left-1/2 -translate-x-1/2 bg-background border border-border
                      text-[10px] px-1.5 py-0.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity
                      whitespace-nowrap pointer-events-none shadow-md">
        {name}
      </div>
    </div>
  )
}

export function EcosystemSection() {
  return (
    <section className="py-20 md:py-28 overflow-hidden">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-2 gap-12 md:gap-16 items-center">
          {/* Left: copy */}
          <motion.div
            initial={{ opacity: 0, x: -32 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7 }}
            viewport={{ once: true }}
            className="space-y-6"
          >
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-3 py-1.5 rounded-full text-sm font-medium">
              <span className="w-2 h-2 bg-primary rounded-full animate-pulse" />
              Ecosistema Digital
            </div>

            <h2 className="text-3xl md:text-5xl font-bold leading-tight">
              El Centro de tu{' '}
              <span className="bg-gradient-to-r from-primary to-orange-400 bg-clip-text text-transparent">
                Ecosistema Digital
              </span>
            </h2>

            <p className="text-base md:text-lg text-muted-foreground leading-relaxed">
              SocialClubs no reemplaza tus redes sociales — las complementa.
              Mientras ellas te ayudan a ser descubierto, aquí construyes,
              haces crecer y monetizas tu comunidad con herramientas integradas
              y control total.
            </p>

            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Control total', icon: '🎛️' },
                { label: 'Monetización', icon: '💰' },
                { label: 'Gamificación', icon: '🎮' },
                { label: 'Privacidad', icon: '🔒' },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Right: orbit */}
          <motion.div
            initial={{ opacity: 0, scale: 0.85 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            viewport={{ once: true }}
            className="relative h-72 md:h-96 flex items-center justify-center"
          >
            {/* Orbit rings (visual) */}
            <div
              className="absolute w-[260px] h-[100px] md:w-[340px] md:h-[130px] rounded-full border border-primary/15"
              style={{ transform: 'rotateX(68deg)' }}
            />
            <div
              className="absolute w-[180px] h-[70px] md:w-[240px] md:h-[92px] rounded-full border border-primary/10"
              style={{ transform: 'rotateX(68deg)' }}
            />

            {/* Center hub */}
            <div className="relative z-10 flex flex-col items-center">
              <div
                className="w-[72px] h-[72px] md:w-[88px] md:h-[88px] rounded-[22px] flex items-center justify-center
                           bg-gradient-to-br from-primary to-orange-400 shadow-2xl"
                style={{
                  boxShadow:
                    '0 0 36px hsl(20 100% 50% / 0.45), 0 0 72px hsl(20 100% 50% / 0.18)',
                }}
              >
                <span className="text-white font-black text-2xl md:text-3xl leading-none">SC</span>
              </div>
              <div className="absolute inset-0 -m-4 rounded-full bg-primary/10 -z-10 animate-pulse" />
            </div>

            {/* Orbiting icons */}
            {SOCIAL_NETWORKS.map((net, i) => (
              <OrbitIcon
                key={net.name}
                {...net}
                radius={i % 2 === 0 ? 150 : 115}
                speed={i % 2 === 0 ? 0.42 : -0.33}
                startAngle={(i / SOCIAL_NETWORKS.length) * Math.PI * 2}
              />
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  )
}
