import Link from "next/link"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Users, Lock } from "lucide-react"
import type { Club } from "@/types/club"
import Image from "next/image"

interface FeedClubsProps {
    clubs: Club[]
}

export default function FeedClubs({ clubs }: FeedClubsProps) {
    // Dividir los clubs en grupos de 9 para crear hasta 5 carruseles
    const clubRows = []
    const CLUBS_PER_ROW = 9
    const MAX_ROWS = 5

    for (let i = 0; i < Math.min(MAX_ROWS, Math.ceil(clubs.length / CLUBS_PER_ROW)); i++) {
        const start = i * CLUBS_PER_ROW
        const end = start + CLUBS_PER_ROW
        const rowClubs = clubs.slice(start, end)
        if (rowClubs.length > 0) {
            clubRows.push(rowClubs)
        }
    }

    return (
        <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4 px-4">Explorar Más Clubes</h2>

            <div className="space-y-6">
                {clubRows.map((rowClubs, rowIndex) => (
                    <div key={rowIndex} className="overflow-x-auto scrollbar-hide">
                        <div className="flex gap-4 px-4 pb-2">
                            {rowClubs.map((club) => (
                                <Link
                                    key={club.id}
                                    href={`/clubs/${club.id}`}
                                    className="flex-shrink-0 w-[200px]"
                                >
                                    <Card className="overflow-hidden hover:shadow-md transition-all duration-300 hover:translate-y-[-2px] h-full">
                                        <div
                                            className="h-24 relative"
                                            style={{ backgroundColor: club.color || '#64748B' }}
                                        >
                                            {club.logo && typeof club.logo === 'object' && 'url' in club.logo ? (
                                                <Image
                                                    src={club.logo.url as string}
                                                    alt={club.name || 'Club'}
                                                    fill
                                                    className="object-cover opacity-30"
                                                />
                                            ) : null}

                                            {club.privacity === 'private' && (
                                                <div className="absolute top-2 right-2 bg-black/50 rounded-full p-1">
                                                    <Lock size={14} className="text-white" />
                                                </div>
                                            )}

                                            <Badge
                                                className="absolute bottom-2 left-2 font-semibold"
                                                style={{
                                                    backgroundColor: club.color || '#64748B',
                                                    color: 'white',
                                                }}
                                            >
                                                Lvl {club.level || 1}
                                            </Badge>
                                        </div>

                                        <div className="p-3">
                                            <h3 className="font-semibold text-sm truncate mb-1">
                                                {club.name}
                                            </h3>

                                            <p className="text-xs text-muted-foreground line-clamp-2 mb-2 h-8">
                                                {club.bio || 'Sin descripción'}
                                            </p>

                                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                                <Users size={12} />
                                                <span>{club.total_members?.toLocaleString() || 0}</span>
                                            </div>

                                            {club.tags && Array.isArray(club.tags) && club.tags.length > 0 && (
                                                <div className="flex gap-1 mt-2 flex-wrap">
                                                    {club.tags.slice(0, 2).map((tag, index) => (
                                                        <span
                                                            key={index}
                                                            className="text-xs bg-secondary px-1.5 py-0.5 rounded-full truncate max-w-[70px]"
                                                            title={tag}
                                                        >
                                                            #{tag}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </Card>
                                </Link>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </section>
    )
}
