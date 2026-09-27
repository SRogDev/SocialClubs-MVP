'use client'

import { Search, Filter } from 'lucide-react'

import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface ClubsFiltersProps {
    searchQuery: string
    onSearchChange: (value: string) => void
    statusFilter: string
    onStatusChange: (value: string) => void
    sortBy: string
    onSortChange: (value: string) => void
}

/**
 * Componente de filtros para la lista de clubs
 * Client Component para interactividad (search, selects)
 */
export function ClubsFilters({
    searchQuery,
    onSearchChange,
    statusFilter,
    onStatusChange,
    sortBy,
    onSortChange,
}: ClubsFiltersProps) {
    return (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            {/* Search */}
            <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                    placeholder="Buscar por nombre o creator..."
                    value={searchQuery}
                    onChange={(e) => onSearchChange(e.target.value)}
                    className="pl-10"
                />
            </div>

            {/* Filters */}
            <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <Select value={statusFilter} onValueChange={onStatusChange}>
                    <SelectTrigger className="w-[150px]">
                        <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        <SelectItem value="active">Activos</SelectItem>
                        <SelectItem value="banned">Baneados</SelectItem>
                        <SelectItem value="suspended">Suspendidos</SelectItem>
                    </SelectContent>
                </Select>

                <Select value={sortBy} onValueChange={onSortChange}>
                    <SelectTrigger className="w-[150px]">
                        <SelectValue placeholder="Ordenar por" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="created_at">Más recientes</SelectItem>
                        <SelectItem value="members">Más miembros</SelectItem>
                        <SelectItem value="revenue">Mayor revenue</SelectItem>
                        <SelectItem value="engagement">Mayor engagement</SelectItem>
                        <SelectItem value="name">Nombre A-Z</SelectItem>
                    </SelectContent>
                </Select>
            </div>
        </div>
    )
}
