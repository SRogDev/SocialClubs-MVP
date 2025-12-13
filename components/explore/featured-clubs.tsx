import Link from "next/link"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Users } from "lucide-react"
import type { Club } from "@/types/club"
import Image from "next/image"

interface FeaturedClubsProps {
    clubs: Club[]
}

export default function FeaturedClubs({ clubs }: FeaturedClubsProps) {
    return (
        <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4 px-4">Clubes Destacados</h2>

            <div className="overflow-x-auto scrollbar-hide">
                <div className="flex gap-4 px-4 pb-2">
                    {clubs.map((club) => (
                        <Link
                            key={club.id}
                            href={`/clubs/${club.id}`}
                            className="flex-shrink-0 w-[280px]"
                        >
                            <Card className="overflow-hidden hover:shadow-lg transition-all duration-300 hover:translate-y-[-2px] border-2 hover:border-primary">
                                <div
                                    className="h-32 relative"
                                    style={{ backgroundColor: club.color || '#3B82F6' }}
                                >
                                    {club.logo && typeof club.logo === 'object' && 'url' in club.logo ? (
                                        <Image
                                            src={club.logo.url as string}
                                            alt={club.name || 'Club'}
                                            fill
                                            className="object-cover opacity-20"
                                        />
                                    ) : null}

                                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-4">
                                        <h3 className="font-bold text-white text-lg truncate">
                                            {club.name}
                                        </h3>
                                    </div>
                                </div>

                                <div className="p-4">
                                    <p className="text-sm text-muted-foreground line-clamp-2 mb-3 h-10">
                                        {club.bio || 'Sin descripción'}
                                    </p>

                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                            <Users size={16} />
                                            <span>{club.total_members?.toLocaleString() || 0}</span>
                                        </div>

                                        <Badge
                                            variant="secondary"
                                            className="font-semibold"
                                            style={{
                                                backgroundColor: club.color ? `${club.color}20` : undefined,
                                                color: club.color || undefined,
                                            }}
                                        >
                                            Nivel {club.level || 1}
                                        </Badge>
                                    </div>

                                    {club.tags && Array.isArray(club.tags) && club.tags.length > 0 && (
                                        <div className="flex gap-2 mt-3 flex-wrap">
                                            {club.tags.slice(0, 3).map((tag, index) => (
                                                <span
                                                    key={index}
                                                    className="text-xs bg-secondary px-2 py-1 rounded-full"
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
        </section>
    )
}
