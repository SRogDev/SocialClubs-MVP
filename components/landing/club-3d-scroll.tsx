'use client'

import { MeshDistortMaterial } from '@react-three/drei'
import { Canvas, useFrame } from '@react-three/fiber'
import { motion, useScroll, useTransform } from 'framer-motion'
import { useRef, useEffect, useState, Suspense } from 'react'
import * as THREE from 'three'

const FEATURE_ICONS = [
  { color: '#FF5500', label: '🎮 Gamificación', position: [0, 0] as [number, number] },
  { color: '#6366f1', label: '💬 Canales', position: [1, 0.5] as [number, number] },
  { color: '#22c55e', label: '💰 Pagos', position: [-1, 0.5] as [number, number] },
  { color: '#f59e0b', label: '📹 Video', position: [0.7, -0.7] as [number, number] },
  { color: '#ec4899', label: '✨ IA', position: [-0.7, -0.7] as [number, number] },
]

function HubSphere({ progress }: { progress: number }) {
  const meshRef = useRef<THREE.Mesh>(null)
  const glowRef = useRef<THREE.Mesh>(null)

  const scale = 1 + progress * 0.6
  const glowOpacity = 0.08 + progress * 0.14
  const distort = 0.2 + progress * 0.25
  const emissive = 0.3 + progress * 0.5

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.003
      meshRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.3) * 0.1
      meshRef.current.scale.setScalar(scale)
    }
    if (glowRef.current) {
      glowRef.current.rotation.y -= 0.005
      const pulse = 1 + Math.sin(state.clock.elapsedTime * 1.5) * 0.05
      glowRef.current.scale.setScalar(scale * 1.35 * pulse)
    }
  })

  return (
    <group>
      <mesh ref={glowRef}>
        <sphereGeometry args={[1.35, 32, 32]} />
        <meshStandardMaterial
          color="#FF5500"
          transparent
          opacity={glowOpacity}
          side={THREE.BackSide}
        />
      </mesh>
      <mesh ref={meshRef}>
        <sphereGeometry args={[1, 64, 64]} />
        <MeshDistortMaterial
          color="#FF5500"
          emissive="#FF3300"
          emissiveIntensity={emissive}
          metalness={0.4}
          roughness={0.2}
          distort={distort}
          speed={2}
        />
      </mesh>
    </group>
  )
}

function FeatureOrb({
  color,
  index,
  progress,
  startAngle,
}: {
  color: string
  index: number
  progress: number
  startAngle: number
}) {
  const groupRef = useRef<THREE.Group>(null)
  const orbRef = useRef<THREE.Mesh>(null)
  const totalFeatures = FEATURE_ICONS.length

  const featureProgress = Math.max(0, Math.min(1, (progress - index / totalFeatures) * totalFeatures))
  const isVisible = featureProgress > 0
  const distance = THREE.MathUtils.lerp(7, 2.4, featureProgress)
  const opacity = featureProgress

  useFrame((state) => {
    if (!isVisible || !groupRef.current) return
    const angle = startAngle + state.clock.elapsedTime * 0.25
    groupRef.current.position.x = Math.cos(angle) * distance
    groupRef.current.position.y = Math.sin(angle * 0.8) * distance * 0.45
    groupRef.current.position.z = Math.sin(angle) * distance * 0.55
    if (orbRef.current) {
      const pulse = 1 + Math.sin(state.clock.elapsedTime * 2 + index) * 0.08
      orbRef.current.scale.setScalar(pulse)
    }
  })

  if (!isVisible) return null

  return (
    <group ref={groupRef}>
      <mesh>
        <sphereGeometry args={[0.44, 16, 16]} />
        <meshStandardMaterial
          color={color}
          transparent
          opacity={opacity * 0.22}
          side={THREE.BackSide}
        />
      </mesh>
      <mesh ref={orbRef}>
        <sphereGeometry args={[0.3, 32, 32]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.7}
          metalness={0.3}
          roughness={0.2}
          transparent
          opacity={opacity}
        />
      </mesh>
    </group>
  )
}

function Scene({ progress }: { progress: number }) {
  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight position={[10, 10, 5]} intensity={1.2} />
      <pointLight position={[-5, 5, -5]} intensity={0.9} color="#FF5500" />
      <pointLight position={[5, -5, 5]} intensity={0.5} color="#6366f1" />
      <HubSphere progress={progress} />
      {FEATURE_ICONS.map((feature, i) => (
        <FeatureOrb
          key={feature.label}
          color={feature.color}
          index={i}
          progress={progress}
          startAngle={(i / FEATURE_ICONS.length) * Math.PI * 2}
        />
      ))}
    </>
  )
}

const bullets = [
  {
    title: 'Tu espacio, tus reglas',
    description: 'Un club privado donde defines la experiencia completa para tu comunidad.',
  },
  {
    title: 'Gamificación que engancha',
    description: 'Sistema de puntos, rangos y recompensas para mantener a tus miembros activos.',
  },
  {
    title: 'Comunidad en tiempo real',
    description: 'Canales de chat exclusivos organizados por temáticas y niveles de acceso.',
  },
  {
    title: 'Monetización sin fricciones',
    description: 'Cobra suscripciones y sesiones pagas directo desde tu club.',
  },
  {
    title: 'Videollamadas integradas',
    description: 'Sesiones en vivo con tus miembros sin salir de la plataforma.',
  },
  {
    title: 'IA que potencia tu club',
    description: 'Asistente inteligente que crea contenido y gestiona tu comunidad.',
  },
]

export function ClubScrollSection() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [activeBullet, setActiveBullet] = useState(0)
  const [progressValue, setProgressValue] = useState(0)

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end end'],
  })

  const progress = useTransform(scrollYProgress, [0, 1], [0, 1])

  useEffect(() => {
    return progress.on('change', (v) => {
      setProgressValue(v)
      setActiveBullet(Math.min(Math.floor(v * bullets.length), bullets.length - 1))
    })
  }, [progress])

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768

  return (
    <section
      ref={containerRef}
      className="relative"
      style={{ height: `${bullets.length * 100}vh` }}
    >
      <div className="sticky top-0 h-screen overflow-hidden flex items-center">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            {/* Bullets */}
            <div className="space-y-5 z-10">
              <h2 className="text-3xl md:text-4xl font-bold mb-8">
                Todo lo que tu{' '}
                <span className="bg-gradient-to-r from-primary to-orange-400 bg-clip-text text-transparent">
                  comunidad necesita
                </span>
              </h2>
              {bullets.map((bullet, i) => (
                <motion.div
                  key={i}
                  animate={{
                    opacity: i === activeBullet ? 1 : i < activeBullet ? 0.45 : 0.25,
                    x: i === activeBullet ? 0 : -6,
                    scale: i === activeBullet ? 1 : 0.97,
                  }}
                  transition={{ duration: 0.3 }}
                  className="flex items-start gap-4"
                >
                  <div
                    className={`mt-0.5 flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 ${i === activeBullet
                        ? 'bg-primary text-white shadow-[0_0_16px_4px_hsl(20_100%_50%/0.35)]'
                        : i < activeBullet
                          ? 'bg-primary/25 text-primary'
                          : 'bg-muted text-muted-foreground'
                      }`}
                  >
                    {i < activeBullet ? '✓' : i + 1}
                  </div>
                  <div>
                    <h3
                      className={`font-bold text-base md:text-lg leading-snug ${i === activeBullet ? 'text-foreground' : 'text-foreground/50'
                        }`}
                    >
                      {bullet.title}
                    </h3>
                    <p
                      className={`text-sm mt-1 leading-relaxed ${i === activeBullet ? 'text-muted-foreground' : 'text-muted-foreground/35'
                        }`}
                    >
                      {bullet.description}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* 3D Canvas — desktop only */}
            <div className="hidden md:block relative h-[520px]" aria-hidden="true">
              <Canvas
                aria-hidden="true"
                camera={{ position: [0, 0, 6], fov: 50 }}
                dpr={isMobile ? [1, 1.5] : [1, 2]}
                performance={{ min: 0.5 }}
                gl={{ antialias: !isMobile, powerPreference: 'high-performance' }}
              >
                <Suspense fallback={null}>
                  <Scene progress={progressValue} />
                </Suspense>
              </Canvas>
              {/* Radial glow that grows with progress */}
              <div
                className="absolute inset-0 pointer-events-none rounded-2xl"
                style={{
                  background: `radial-gradient(ellipse at center, hsl(20 100% 50% / ${progressValue * 0.1}) 0%, transparent 70%)`,
                  transition: 'background 0.3s',
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
