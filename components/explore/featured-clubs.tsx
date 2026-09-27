import Link from "next/link"

import type { Club } from "@/types/club"

import { FeaturedClubCard } from "./featured-club-card"

interface FeaturedClubsProps {
    clubs: Club[]
}

export default function FeaturedClubs({ clubs }: FeaturedClubsProps) {
    return (
        <section className="mb-8">
            <h2 className="text-2xl font-bold mb-6 px-4">Clubes Destacados</h2>

            <div className="relative">
                <div className="overflow-x-auto scrollbar-hide scroll-smooth snap-x snap-mandatory">
                    <div className="flex gap-4 px-4 pb-2">
                        {clubs.map((club, index) => (
                            <Link
                                key={club.id}
                                href={`/clubs/${club.id}`}
                                className="flex-shrink-0 w-[280px] snap-start"
                            >
                                <FeaturedClubCard club={club} index={index} />
                            </Link>
                        ))}
                    </div>
                </div>
                {/* Fade gradient to signal more content */}
                <div
                    className="absolute right-0 top-0 bottom-0 w-12 pointer-events-none bg-gradient-to-l from-background to-transparent"
                    aria-hidden
                />
            </div>
        </section>
    )
}
