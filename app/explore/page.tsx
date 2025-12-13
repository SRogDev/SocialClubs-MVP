import { Suspense } from "react"
import FeaturedClubs from "@/components/explore/featured-clubs"
import FeedClubs from "@/components/explore/feed-clubs"
import { getFeaturedClubs, getAllClubs } from "@/services/exploreService"
import { Skeleton } from "@/components/ui/skeleton"

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
      <Skeleton className="h-8 w-56 mb-4 mx-4" />
      <div className="space-y-6">
        {[...Array(3)].map((_, rowIndex) => (
          <div key={rowIndex} className="overflow-x-auto scrollbar-hide">
            <div className="flex gap-4 px-4 pb-2">
              {[...Array(9)].map((_, i) => (
                <Skeleton key={i} className="flex-shrink-0 w-[200px] h-[220px] rounded-lg" />
              ))}
            </div>
          </div>
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
    <div className="min-h-screen pb-20 bg-background">
      <div className="max-w-7xl mx-auto py-6">
        <h1 className="text-3xl font-bold mb-6 px-4 bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
          Explorar
        </h1>

        <Suspense fallback={
          <>
            <FeaturedClubsSkeleton />
            <FeedClubsSkeleton />
          </>
        }>
          <ExploreContent />
        </Suspense>
      </div>
    </div>
  )
}
