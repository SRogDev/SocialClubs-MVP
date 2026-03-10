import Link from "next/link"
import type { Club } from "@/types/club"
import { FeedClubCard } from "./feed-club-card"

interface FeedClubsProps {
    clubs: Club[]
}

export default function FeedClubs({ clubs }: FeedClubsProps) {
    return (
        <section className="mb-8">
            <h2 className="text-2xl font-bold mb-6 px-4">Explorar Más Clubes</h2>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 px-4">
                {clubs.map((club, index) => (
                    <Link
                        key={club.id}
                        href={`/clubs/${club.id}`}
                    >
                        <FeedClubCard club={club} index={index} />
                    </Link>
                ))}
            </div>
        </section>
    )
}
