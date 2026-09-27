import { Suspense } from "react"

import { ClubCreationWizard } from "@/components/club-creation"

function CreateClubSkeleton() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-2xl animate-pulse bg-card border border-border/50 rounded-xl h-[500px]" />
    </div>
  )
}

export default function CreateClubPage() {
  return (
    <Suspense fallback={<CreateClubSkeleton />}>
      <ClubCreationWizard />
    </Suspense>
  )
}
