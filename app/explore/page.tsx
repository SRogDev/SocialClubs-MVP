import { Suspense } from "react"

import FeaturedClubs from "@/components/explore/featured-clubs"
import FeedClubs from "@/components/explore/feed-clubs"
import { Skeleton } from "@/components/ui/skeleton"
import { ExploreSpotlightWrapper } from "@/components/explore/explore-spotlight-wrapper"

import { getFeaturedClubs, getAllClubs } from "@/services/exploreService"

function FeaturedClubsSkeleton() {
  return (
    <section className="mb-8">
      <Skeleton className="h-8 w-48 mb-4 mx-4" />
      <div className="overflow-x-auto scrollbar-hide">
        <div className="flex gap-4 px-4 pb-2">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="flex-shrink-0 w-[280px] h-[280px] rounded-lg" />
          ))}
        </div>
      </div>
    </section>
  )
}

function FeedClubsSkeleton() {
  return (
    <section className="mb-8">
      <Skeleton className="h-8 w-56 mb-6 mx-4" />
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 px-4">
        {[...Array(8)].map((_, i) => (
          <Skeleton key={i} className="w-full h-[220px] rounded-lg" />
        ))}
      </div>
    </section>
  )
}

async function ExploreContent() {
  const [featuredClubs, allClubs] = await Promise.all([
    getFeaturedClubs(),
    getAllClubs(),
  ])

  return (
    <>
      <FeaturedClubs clubs={featuredClubs} />
      <FeedClubs clubs={allClubs} />
    </>
  )
}

export default function ExplorePage() {
  return (
    <div className="min-h-screen pb-24 bg-background">
      <ExploreSpotlightWrapper>
        <Suspense fallback={
          <>
            <FeaturedClubsSkeleton />
            <FeedClubsSkeleton />
          </>
        }>
          <ExploreContent />
        </Suspense>
      </ExploreSpotlightWrapper>
    </div>
  )
}
