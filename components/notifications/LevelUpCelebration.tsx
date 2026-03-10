'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles } from 'lucide-react'
import type { LevelUpMetadata } from '@/types/notification'

interface LevelUpCelebrationProps {
    /** Data del level-up (null = no mostrar) */
    data: LevelUpMetadata | null
    /** Callback cuando la animación termina */
    onDismiss: () => void
}

/**
 * Animación full-screen de celebración cuando un club sube de nivel.
 * Se muestra como overlay, auto-dismiss en 4 segundos o al tocar.
 */
export function LevelUpCelebration({ data, onDismiss }: LevelUpCelebrationProps) {
    const [visible, setVisible] = useState(false)

    useEffect(() => {
        if (data) {
            setVisible(true)
            const timer = setTimeout(() => {
                setVisible(false)
                setTimeout(onDismiss, 400)
            }, 4000)
            return () => clearTimeout(timer)
        }
    }, [data, onDismiss])

    if (!data) return null

    const color = data.club_color || '#f97316'

    // Generate particle positions
    const particles = Array.from({ length: 24 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        delay: Math.random() * 0.8,
        size: 4 + Math.random() * 8,
        duration: 1.5 + Math.random() * 1.5,
    }))

    return (
        <AnimatePresence>
            {visible && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="fixed inset-0 z-[100] flex items-center justify-center"
                    onClick={() => {
                        setVisible(false)
                        setTimeout(onDismiss, 400)
                    }}
                >
                    {/* Backdrop */}
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

                    {/* Confetti particles */}
                    {particles.map((p) => (
                        <motion.div
                            key={p.id}
                            initial={{
                                x: `${p.x}vw`,
                                y: '-10vh',
                                opacity: 1,
                                rotate: 0,
                            }}
                            animate={{
                                y: '110vh',
                                rotate: 360 + Math.random() * 360,
                                opacity: [1, 1, 0],
                            }}
                            transition={{
                                duration: p.duration,
                                delay: p.delay,
                                ease: 'easeIn',
                            }}
                            className="absolute rounded-sm"
                            style={{
                                width: p.size,
                                height: p.size,
                                backgroundColor:
                                    p.id % 3 === 0
                                        ? color
                                        : p.id % 3 === 1
                                            ? '#fbbf24'
                                            : '#60a5fa',
                            }}
                        />
                    ))}

                    {/* Center content */}
                    <motion.div
                        initial={{ scale: 0.5, opacity: 0, y: 30 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.8, opacity: 0, y: -20 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.15 }}
                        className="relative z-10 flex flex-col items-center text-center px-8"
                    >
                        {/* Glow ring */}
                        <motion.div
                            animate={{
                                boxShadow: [
                                    `0 0 30px ${color}40`,
                                    `0 0 60px ${color}60`,
                                    `0 0 30px ${color}40`,
                                ],
                            }}
                            transition={{ duration: 2, repeat: Infinity }}
                            className="w-28 h-28 rounded-3xl flex items-center justify-center mb-6"
                            style={{
                                background: `linear-gradient(135deg, ${color}, ${color}cc)`,
                            }}
                        >
                            <motion.span
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ type: 'spring', delay: 0.4, stiffness: 200 }}
                                className="text-5xl font-black text-white"
                            >
                                {data.new_level}
                            </motion.span>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.5 }}
                            className="flex items-center gap-2 mb-2"
                        >
                            <Sparkles size={20} className="text-yellow-400" />
                            <span className="text-sm font-medium text-yellow-400 uppercase tracking-wider">
                                ¡Nivel alcanzado!
                            </span>
                            <Sparkles size={20} className="text-yellow-400" />
                        </motion.div>

                        <motion.h2
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.65 }}
                            className="text-2xl font-bold text-white mb-1"
                        >
                            {data.club_name}
                        </motion.h2>

                        <motion.p
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.8 }}
                            className="text-white/70 text-sm"
                        >
                            Nivel {data.old_level} → Nivel {data.new_level}
                        </motion.p>

                        <motion.p
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 0.5 }}
                            transition={{ delay: 2 }}
                            className="text-white/40 text-xs mt-6"
                        >
                            Toca para cerrar
                        </motion.p>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    )
}
