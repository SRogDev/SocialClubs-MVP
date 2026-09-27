'use client'

import { motion } from 'framer-motion'
import { Settings } from 'lucide-react'

interface ConfigLineProps {
    title: string
}

export function ConfigLine({ title }: ConfigLineProps) {
    return (
        <div className="flex items-center justify-between border-b border-border pb-3 mb-6">
            <h2 className="text-xl font-semibold">{title}</h2>
            <motion.div
                animate={{ rotate: 360 }}
                transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: 'linear',
                }}
            >
                <Settings className="w-5 h-5 text-muted-foreground" />
            </motion.div>
        </div>
    )
}
