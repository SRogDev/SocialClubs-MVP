'use client'

import { useState } from 'react'

import type { ClubWithDetails } from '@/services/adminService'

import { ClubAdminCard } from './ClubAdminCard'
import { ClubsFilters } from './ClubsFilters'

interface ClubsGridProps {
    clubs: ClubWithDetails[]
}

/**
 * Componente de grid de clubs con filtros
 * Client Component para manejo de estado de filtros
 */
export function ClubsGrid({ clubs }: ClubsGridProps) {
    const [searchQuery, setSearchQuery] = useState('')
    const [statusFilter, setStatusFilter] = useState<string>('all')
    const [sortBy, setSortBy] = useState<string>('created_at')

    // Filtrar y ordenar clubs
    const filteredClubs = clubs
        .filter((club) => {
            // Filtro de búsqueda
            const matchesSearch =
                club.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (club.creator.username?.toLowerCase() || '').includes(searchQuery.toLowerCase())

            // Filtro de status
            const matchesStatus = statusFilter === 'all' || club.status === statusFilter

            return matchesSearch && matchesStatus
        })
        .sort((a, b) => {
            switch (sortBy) {
                case 'created_at':
                    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
                case 'members':
                    return b.total_members - a.total_members
                case 'revenue':
                    return b.stats.revenue - a.stats.revenue
                case 'engagement':
                    return b.stats.engagement - a.stats.engagement
                case 'name':
                    return a.name.localeCompare(b.name)
                default:
                    return 0
            }
        })

    return (
        <div className="space-y-6">
            {/* Filters */}
            <ClubsFilters
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                statusFilter={statusFilter}
                onStatusChange={setStatusFilter}
                sortBy={sortBy}
                onSortChange={setSortBy}
            />

            {/* Stats */}
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
                <span>
                    <strong className="text-foreground">{filteredClubs.length}</strong> clubs encontrados
                </span>
                <span>
                    <strong className="text-foreground">{clubs.filter(c => c.status === 'active').length}</strong> activos
                </span>
                <span>
                    <strong className="text-foreground">{clubs.filter(c => c.status === 'banned').length}</strong> baneados
                </span>
            </div>

            {/* Grid */}
            {filteredClubs.length === 0 ? (
                <div className="flex h-64 items-center justify-center rounded-lg border border-dashed">
                    <div className="text-center">
                        <p className="text-lg font-semibold">No se encontraron clubs</p>
                        <p className="text-sm text-muted-foreground">
                            Intenta ajustar los filtros de búsqueda
                        </p>
                    </div>
                </div>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {filteredClubs.map((club) => (
                        <ClubAdminCard key={club.id} club={club} />
                    ))}
                </div>
            )}
        </div>
    )
}
