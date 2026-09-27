"use client"

import dynamic from "next/dynamic"

// Client-side wrapper: next/dynamic with `ssr: false` is only allowed
// inside Client Components. The heavy Three.js section renders after hydration.
const ClubScrollSection = dynamic(
  () =>
    import("@/components/landing/club-3d-scroll").then((m) => ({
      default: m.ClubScrollSection,
    })),
  {
    ssr: false,
    loading: () => (
      <div
        className="h-[60vh] flex items-center justify-center bg-gradient-to-b from-transparent to-muted/20"
        aria-hidden="true"
      />
    ),
  }
)

export default function ClubScrollSectionLazy() {
  return <ClubScrollSection />
}
