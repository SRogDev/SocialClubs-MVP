import { Loader2 } from "lucide-react"

import { cn } from "@/lib/utils"

type SpinnerProps = {
  className?: string
}

/** Simple loading spinner. */
export function Spinner({ className }: SpinnerProps) {
  return <Loader2 className={cn("h-4 w-4 animate-spin", className)} aria-label="Cargando" />
}

type DotsLoaderProps = {
  className?: string
  /** Visual variant. */
  variant?: "default" | "premium"
}

/** Three-dot bouncing loader. */
export function DotsLoader({ className, variant = "default" }: DotsLoaderProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1",
        variant === "premium" && "text-amber-500",
        className
      )}
      aria-label="Cargando"
    >
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="h-1.5 w-1.5 rounded-full bg-current animate-bounce"
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </span>
  )
}
