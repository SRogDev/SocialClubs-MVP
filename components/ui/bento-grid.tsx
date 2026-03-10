'use client'

import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'

interface BentoItem {
  title: string
  description?: string
  header?: React.ReactNode
  icon?: React.ReactNode
  /** Tailwind col-span + row-span classes e.g. "col-span-2 row-span-1" */
  className?: string
}

interface BentoGridProps {
  items: BentoItem[]
  className?: string
}

/**
 * Bento Grid – inspired by Aceternity UI.
 * Pass items with optional className for different grid spans.
 */
export function BentoGrid({ items, className }: BentoGridProps) {
  return (
    <div
      className={cn(
        'grid auto-rows-[160px] grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4',
        className
      )}
    >
      {items.map((item, i) => (
        <BentoGridItem key={i} {...item} index={i} />
      ))}
    </div>
  )
}

function BentoGridItem({
  title,
  description,
  header,
  icon,
  className,
  index,
}: BentoItem & { index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4, delay: index * 0.06 }}
      className={cn(
        'group relative overflow-hidden rounded-2xl border border-border/60 bg-card p-5',
        'hover:border-primary/30 hover:shadow-[0_0_24px_hsl(20_100%_50%/0.1)] transition-all duration-300',
        className
      )}
    >
      {/* Header (chart / image / etc.) */}
      {header && (
        <div className="mb-3 w-full overflow-hidden rounded-xl">{header}</div>
      )}

      {/* Icon */}
      {icon && (
        <div className="mb-2 text-primary opacity-80 group-hover:opacity-100 transition-opacity">
          {icon}
        </div>
      )}

      <h3 className="font-semibold text-sm md:text-base text-foreground leading-snug">{title}</h3>
      {description && (
        <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{description}</p>
      )}

      {/* Bottom-right electric glow on hover */}
      <div
        className="absolute bottom-0 right-0 w-24 h-24 rounded-full pointer-events-none opacity-0 group-hover:opacity-100
                   bg-primary/10 blur-xl transition-opacity duration-500 translate-x-6 translate-y-6"
      />
    </motion.div>
  )
}
