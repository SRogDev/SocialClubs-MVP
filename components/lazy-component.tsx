"use client"

import type React from "react"

import { useState, useEffect, Suspense } from "react"
import { useInView } from "react-intersection-observer"

interface LazyComponentProps {
  children: React.ReactNode
  fallback?: React.ReactNode
  threshold?: number
  rootMargin?: string
}

export default function LazyComponent({
  children,
  fallback = <div className="h-40 w-full bg-muted/30 animate-pulse rounded-md" />,
  threshold = 0.1,
  rootMargin = "200px",
}: LazyComponentProps) {
  const [shouldRender, setShouldRender] = useState(false)
  const { ref, inView } = useInView({
    threshold,
    rootMargin,
    triggerOnce: true,
  })

  useEffect(() => {
    if (inView) {
      setShouldRender(true)
    }
  }, [inView])

  return <div ref={ref}>{shouldRender ? <Suspense fallback={fallback}>{children}</Suspense> : fallback}</div>
}
