import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"

type AvatarWithBadgeProps = {
  src?: string
  alt?: string
  fallback?: string
  /** Member level shown as a small badge. */
  level?: number
  /** Accent color for the badge/ring. */
  color?: string
  size?: "sm" | "md" | "lg"
  className?: string
}

const sizeClasses = {
  sm: "h-8 w-8",
  md: "h-10 w-10",
  lg: "h-16 w-16",
}

/** Avatar with a small level badge overlay. */
export default function AvatarWithBadge({
  src,
  alt,
  fallback,
  level,
  color,
  size = "md",
  className,
}: AvatarWithBadgeProps) {
  return (
    <div className={cn("relative inline-flex shrink-0", className)}>
      <Avatar className={sizeClasses[size]}>
        <AvatarImage src={src || "/placeholder.svg"} alt={alt} />
        <AvatarFallback>{fallback}</AvatarFallback>
      </Avatar>
      {typeof level === "number" && (
        <span
          className="absolute -bottom-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-bold text-white ring-2 ring-background"
          style={{ backgroundColor: color || "#7c3aed" }}
        >
          {level}
        </span>
      )}
    </div>
  )
}
