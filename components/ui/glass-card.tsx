import * as React from "react"

import { cn } from "@/lib/utils"

type GlassCardProps = React.ComponentProps<"div"> & {
  /** Accent color used for the tinted border/glow (hex, e.g. "#F97316"). */
  color?: string
}

/**
 * Glassmorphism card used across club pages.
 * Renders a translucent, blurred surface with an optional accent tint.
 */
export default function GlassCard({ className, color, style, ...props }: GlassCardProps) {
  return (
    <div
      data-slot="glass-card"
      className={cn(
        "flex flex-col gap-6 rounded-xl border py-6 shadow-sm",
        "bg-white/60 backdrop-blur-md dark:bg-gray-900/60",
        className
      )}
      style={{
        ...(color ? { borderColor: `${color}40` } : {}),
        ...style,
      }}
      {...props}
    />
  )
}
