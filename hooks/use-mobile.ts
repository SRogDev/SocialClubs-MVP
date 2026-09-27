import * as React from "react"

/**
 * Mobile-detection hook (shadcn/ui standard).
 * Returns true when the viewport is narrower than the `md` breakpoint.
 */
export function useIsMobile(breakpoint = 768): boolean {
  const [isMobile, setIsMobile] = React.useState<boolean>(false)

  React.useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return
    }
    const mql = window.matchMedia(`(max-width: ${breakpoint - 1}px)`)
    const onChange = () => setIsMobile(mql.matches)
    onChange()
    mql.addEventListener("change", onChange)
    return () => mql.removeEventListener("change", onChange)
  }, [breakpoint])

  return isMobile
}

export default useIsMobile
