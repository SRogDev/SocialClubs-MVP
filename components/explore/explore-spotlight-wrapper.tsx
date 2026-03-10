'use client'

import { Spotlight } from '@/components/ui/spotlight'
import { motion } from 'framer-motion'

export function ExploreSpotlightWrapper({ children }: { children: React.ReactNode }) {
  return (
    <Spotlight className="max-w-7xl mx-auto py-6" radius={400}>
      <motion.h1
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-3xl font-bold mb-6 px-4 bg-gradient-to-r from-primary to-orange-400 bg-clip-text text-transparent"
      >
        Explorar
      </motion.h1>
      {children}
    </Spotlight>
  )
}
