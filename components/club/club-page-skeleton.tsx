import { Skeleton } from '@/components/ui/skeleton'

export function ClubPageSkeleton() {
    return (
        <div className="min-h-screen bg-background flex flex-col">
            {/* Header skeleton */}
            <div className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
                <div className="flex items-center justify-between px-4 py-3 gap-3">
                    <div className="flex items-center gap-3">
                        <Skeleton className="h-8 w-8 rounded-lg" />
                        <Skeleton className="h-9 w-9 rounded-xl" />
                        <div className="space-y-1">
                            <Skeleton className="h-4 w-28" />
                            <Skeleton className="h-3 w-20" />
                        </div>
                    </div>
                    <Skeleton className="h-6 w-14 rounded-full" />
                </div>
                {/* Tabs skeleton */}
                <div className="flex gap-2 px-4 pb-3 pt-1">
                    {[...Array(3)].map((_, i) => (
                        <Skeleton key={i} className="h-8 w-20 rounded-lg" />
                    ))}
                </div>
            </div>

            {/* Posts skeleton */}
            <div className="flex-1 p-4 space-y-4">
                {[...Array(3)].map((_, i) => (
                    <div key={i} className="border border-border/50 rounded-2xl overflow-hidden bg-card">
                        {/* Post header */}
                        <div className="flex items-center gap-3 p-4">
                            <Skeleton className="h-10 w-10 rounded-full" />
                            <div className="space-y-1.5 flex-1">
                                <Skeleton className="h-4 w-32" />
                                <Skeleton className="h-3 w-20" />
                            </div>
                        </div>
                        {/* Post image */}
                        <Skeleton className="h-64 w-full rounded-none" />
                        {/* Post actions */}
                        <div className="flex gap-4 p-4">
                            <Skeleton className="h-8 w-16 rounded-lg" />
                            <Skeleton className="h-8 w-16 rounded-lg" />
                            <Skeleton className="h-8 w-16 rounded-lg" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
