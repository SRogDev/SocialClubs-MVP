'use client'

import { motion, AnimatePresence, LayoutGroup } from 'framer-motion'
import { ChevronLeft, ChevronRight, Quote } from 'lucide-react'
import { useState, useEffect } from 'react'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'


const TESTIMONIALS = [
  {
    id: 1,
    name: 'María González',
    role: 'Creadora de contenido fitness',
    avatar: '',
    initials: 'MG',
    review:
      'SocialClubs transformó cómo gestiono mi comunidad. La gamificación mantiene a todos comprometidos y el sistema de suscripciones me genera ingresos predecibles cada mes.',
    stars: 5,
  },
  {
    id: 2,
    name: 'Carlos Rodríguez',
    role: 'Mentor de negocios digitales',
    avatar: '',
    initials: 'CR',
    review:
      'Las tareas personalizadas y el sistema de recompensas aumentaron la participación un 300%. Mis alumnos ahora compiten por llegar al top del leaderboard.',
    stars: 5,
  },
  {
    id: 3,
    name: 'Ana Martínez',
    role: 'Profesora de idiomas online',
    avatar: '',
    initials: 'AM',
    review:
      'Increíble plataforma. Los analytics me ayudan a entender qué contenido funciona mejor. Las videollamadas integradas son un game changer para mis sesiones privadas.',
    stars: 5,
  },
  {
    id: 4,
    name: 'Luis Fernández',
    role: 'Coach de trading',
    avatar: '',
    initials: 'LF',
    review:
      'Fácil de usar y muy completa. Paso a paso pude monetizar mi conocimiento. El soporte es excepcional y la plataforma mejora constantemente.',
    stars: 5,
  },
  {
    id: 5,
    name: 'Sofía López',
    role: 'Artista y diseñadora',
    avatar: '',
    initials: 'SL',
    review:
      'El mejor sistema de gestión de comunidades creativas que he usado. Puedo compartir mi proceso, cobrar por acceso exclusivo y conectar de verdad con mis fans.',
    stars: 5,
  },
]

function StarRating({ count }: { count: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: count }).map((_, i) => (
        <span key={i} className="text-primary text-sm">★</span>
      ))}
    </div>
  )
}

export function TestimonialsSection() {
  const [current, setCurrent] = useState(0)
  const total = TESTIMONIALS.length

  const prev = () => setCurrent((c) => (c - 1 + total) % total)
  const next = () => setCurrent((c) => (c + 1) % total)

  // Auto-advance
  useEffect(() => {
    const id = setInterval(next, 5000)
    return () => clearInterval(id)
  }, [])

  // Indices of visible cards: [prev, current, next]
  const indices = [
    (current - 1 + total) % total,
    current,
    (current + 1) % total,
  ]

  return (
    <section className="py-20 md:py-28 overflow-hidden">
      <div className="container mx-auto px-4">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12 space-y-3"
        >
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-3 py-1.5 rounded-full text-sm font-medium">
            <Quote size={14} />
            Testimonios
          </div>
          <h2 className="text-3xl md:text-4xl font-bold">
            Lo que dicen{' '}
            <span className="bg-gradient-to-r from-primary to-orange-400 bg-clip-text text-transparent">
              nuestros creadores
            </span>
          </h2>
        </motion.div>

        {/* Horizontal carousel — 3 cards visible, center one is focused */}
        <div className="relative flex items-center justify-center gap-4 md:gap-6 select-none">
          <LayoutGroup>
            {indices.map((idx, pos) => {
              const t = TESTIMONIALS[idx]
              const isCenter = pos === 1

              return (
                <motion.div
                  key={t.id}
                  layout
                  layoutId={`card-${t.id}`}
                  animate={{
                    scale: isCenter ? 1 : 0.82,
                    opacity: isCenter ? 1 : 0.45,
                    zIndex: isCenter ? 10 : 0,
                    y: isCenter ? 0 : 20,
                  }}
                  transition={{ type: 'spring', stiffness: 280, damping: 28 }}
                  className={`relative flex-shrink-0 rounded-2xl border border-border bg-card p-6 md:p-8
                              ${isCenter ? 'w-72 md:w-96 shadow-2xl' : 'w-56 md:w-72 shadow-md hidden sm:block'}`}
                  style={{
                    boxShadow: isCenter
                      ? '0 8px 40px hsl(20 100% 50% / 0.15), 0 2px 12px rgba(0,0,0,0.08)'
                      : undefined,
                  }}
                >
                  {isCenter && (
                    <div className="absolute top-4 right-4 text-primary/20">
                      <Quote size={32} />
                    </div>
                  )}

                  <div className="space-y-4">
                    <StarRating count={t.stars} />
                    <p className={`text-sm md:text-base leading-relaxed text-muted-foreground ${isCenter ? 'line-clamp-none' : 'line-clamp-3'}`}>
                      &ldquo;{t.review}&rdquo;
                    </p>
                    <div className="flex items-center gap-3 pt-2 border-t border-border/50">
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={t.avatar || undefined} />
                        <AvatarFallback className="bg-primary/15 text-primary text-xs font-bold">
                          {t.initials}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-semibold leading-tight">{t.name}</p>
                        <p className="text-xs text-muted-foreground">{t.role}</p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </LayoutGroup>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-4 mt-10">
          <button
            onClick={prev}
            className="w-9 h-9 rounded-full border border-border flex items-center justify-center
                       text-muted-foreground hover:text-primary hover:border-primary transition-colors"
            aria-label="Anterior"
          >
            <ChevronLeft size={16} />
          </button>

          {/* Dots */}
          <div className="flex gap-1.5">
            {TESTIMONIALS.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                className={`rounded-full transition-all duration-300 ${
                  i === current
                    ? 'w-6 h-2 bg-primary'
                    : 'w-2 h-2 bg-muted hover:bg-primary/40'
                }`}
                aria-label={`Ir al testimonio ${i + 1}`}
              />
            ))}
          </div>

          <button
            onClick={next}
            className="w-9 h-9 rounded-full border border-border flex items-center justify-center
                       text-muted-foreground hover:text-primary hover:border-primary transition-colors"
            aria-label="Siguiente"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </section>
  )
}
