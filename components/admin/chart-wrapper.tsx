'use client'

import { motion } from 'framer-motion'
import { SpotlightCard } from '@/components/ui/spotlight'

interface ChartWrapperProps {
    children: React.ReactNode
    index?: number
}

/**
 * Thin client wrapper that adds SpotlightCard + staggered entrance animation
 * around server-rendered chart components in the admin dashboard.
 */
export function ChartWrapper({ children, index = 0 }: ChartWrapperProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: index * 0.1, ease: [0.21, 0.45, 0.27, 0.9] }}
        >
            <SpotlightCard className="h-full rounded-xl overflow-hidden">
                {children}
            </SpotlightCard>
        </motion.div>
    )
}
