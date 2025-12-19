'use client'

import Link from 'next/link'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { StatusBadge } from './StatusBadge'
import { Crown, Shield, Users, DollarSign } from 'lucide-react'
import { ClubWithDetails } from '@/services/adminService'

interface ClubAdminCardProps {
    club: ClubWithDetails
}

export function ClubAdminCard({ club }: ClubAdminCardProps) {
    const logoUrl = typeof club.logo === 'object' && club.logo?.url ? club.logo.url : null
    const createdDate = new Date(club.created_at).toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    })

    // Badge de nivel
    const getLevelBadge = () => {
        if (club.level >= 10) {
            return (
                <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                    <Crown className="mr-1 h-3 w-3" />
                    Level {club.level}
                </Badge>
            )
        }
        if (club.level >= 5) {
            return (
                <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                    <Shield className="mr-1 h-3 w-3" />
                    Level {club.level}
                </Badge>
            )
        }
        return (
            <Badge variant="outline">
                Level {club.level}
            </Badge>
        )
    }

    return (
        <Link href={`/clubs/${club.id}`}>
            <Card className="transition-all hover:shadow-lg hover:scale-[1.02] cursor-pointer">
                <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                            <Avatar className="h-12 w-12">
                                <AvatarImage src={logoUrl || undefined} alt={club.name} />
                                <AvatarFallback>{club.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div>
                                <h3 className="font-semibold text-lg">{club.name}</h3>
                                <p className="text-sm text-muted-foreground line-clamp-1">
                                    {club.bio}
                                </p>
                            </div>
                        </div>
                        <StatusBadge status={club.status} />
                    </div>
                </CardHeader>

                <CardContent className="space-y-4">
                    {/* Stats Row */}
                    <div className="grid grid-cols-3 gap-2">
                        <div className="flex items-center gap-2 text-sm">
                            <Users className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{club.total_members}</span>
                            <span className="text-muted-foreground">miembros</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                            <DollarSign className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">
                                ${(club.stats.revenue / 100).toFixed(0)}
                            </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                            <span className="font-medium">{club.stats.engagement}</span>
                            <span className="text-muted-foreground">engagement</span>
                        </div>
                    </div>

                    {/* Creator Info */}
                    <div className="flex items-center justify-between pt-3 border-t">
                        <div className="flex items-center gap-2">
                            <Avatar className="h-6 w-6">
                                <AvatarImage
                                    src={club.creator.avatar_url || undefined}
                                    alt={club.creator.name}
                                />
                                <AvatarFallback className="text-xs">
                                    {club.creator.name.charAt(0)}
                                </AvatarFallback>
                            </Avatar>
                            <span className="text-sm text-muted-foreground">
                                @{club.creator.username}
                            </span>
                        </div>
                        {getLevelBadge()}
                    </div>

                    {/* Created Date */}
                    <div className="text-xs text-muted-foreground">
                        Creado: {createdDate}
                    </div>
                </CardContent>
            </Card>
        </Link>
    )
}
