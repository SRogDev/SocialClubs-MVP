'use client'

/**
 * WidgetSelector — bottom-sheet widget picker.
 *
 * Reads from PLATFORM_WIDGETS registry (lib/widget-templates.ts).
 * On selection → opens WidgetModal with the chosen template.
 */

import { motion, AnimatePresence } from 'framer-motion'
import {
    Gift, Timer, MessageCircleQuestion, Puzzle, type LucideIcon,
} from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import WidgetModal from '@/components/widgets/widget-modal'
import { PLATFORM_WIDGETS, type WidgetRegistryEntry } from '@/lib/widget-templates'

const ICON_MAP: Record<string, LucideIcon> = {
    Gift, Timer, MessageCircleQuestion, Puzzle,
}

interface WidgetSelectorProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    clubId: string
    userId: string | null
}

export default function WidgetSelector({
    open,
    onOpenChange,
    clubId,
    userId,
}: WidgetSelectorProps) {
    const [selectedTemplate, setSelectedTemplate] = useState<WidgetRegistryEntry | null>(null)

    function handleSelect(entry: WidgetRegistryEntry) {
        onOpenChange(false)
        setSelectedTemplate(entry)
    }

    return (
        <>
            <AnimatePresence>
                {open && (
                    <>
                        {/* Backdrop */}
                        <motion.div
                            className="fixed inset-0 z-40 bg-black/40"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => onOpenChange(false)}
                        />

                        {/* Bottom sheet */}
                        <motion.div
                            className="fixed bottom-0 left-0 right-0 z-50 bg-background rounded-t-2xl border-t border-border px-4 pt-4 pb-8 safe-area-bottom"
                            initial={{ y: '100%' }}
                            animate={{ y: 0 }}
                            exit={{ y: '100%' }}
                            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
                        >
                            {/* Drag handle */}
                            <div className="w-10 h-1 rounded-full bg-muted-foreground/30 mx-auto mb-5" />

                            <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-3 px-1">
                                Choose a Widget
                            </p>

                            <div className="grid grid-cols-3 gap-3">
                                {PLATFORM_WIDGETS.map((entry) => {
                                    const Icon = ICON_MAP[entry.icon] ?? Puzzle
                                    return (
                                        <Button
                                            key={entry.slug}
                                            variant="outline"
                                            className="flex flex-col items-center justify-center h-24 gap-2 hover:border-primary hover:bg-primary/5 transition-all"
                                            onClick={() => handleSelect(entry)}
                                        >
                                            <Icon size={22} className="text-primary" />
                                            <span className="text-xs font-medium text-center leading-tight">
                                                {entry.name}
                                            </span>
                                        </Button>
                                    )
                                })}
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {selectedTemplate && (
                <WidgetModal
                    open={!!selectedTemplate}
                    onOpenChange={(v) => !v && setSelectedTemplate(null)}
                    template={selectedTemplate}
                    clubId={clubId}
                    userId={userId}
                />
            )}
        </>
    )
}
