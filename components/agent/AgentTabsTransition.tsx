'use client'

import { motion, AnimatePresence } from 'framer-motion'
import type { ReactNode } from 'react'

interface AgentTabsTransitionProps {
    activeTab: 'config' | 'chat'
    children: ReactNode
}

export function AgentTabsTransition({ activeTab, children }: AgentTabsTransitionProps) {
    return (
        <AnimatePresence mode="wait">
            <motion.div
                key={activeTab}
                initial={{ opacity: 0, x: activeTab === 'config' ? -50 : 50, scale: 0.95 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: activeTab === 'config' ? 50 : -50, scale: 0.95 }}
                transition={{
                    duration: 0.3,
                    ease: [0.4, 0, 0.2, 1],
                }}
            >
                {children}
            </motion.div>
        </AnimatePresence>
    )
}
