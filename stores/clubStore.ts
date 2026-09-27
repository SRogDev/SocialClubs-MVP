/**
 * Club Store - Zustand state management for clubs
 * Manages club state, active club selection, and filtering
 */
import { create } from 'zustand'

import type { Club } from '@/types/club'

interface ClubStore {
    // State
    clubs: Club[]
    activeClubId: string | null
    isLoading: boolean

    // Actions - Clubs Management
    addClub: (club: Club) => void
    setClubs: (clubs: Club[]) => void
    removeClub: (clubId: string) => void
    updateClub: (clubId: string, updates: Partial<Club>) => void
    clearClubs: () => void

    // Selectors
    getClubById: (clubId: string) => Club | undefined
    getClubsByCreator: (creatorId: string) => Club[]
    activeClub: Club | null

    // Active Club
    setActiveClub: (clubId: string) => void
    clearActiveClub: () => void

    // Loading State
    setLoading: (loading: boolean) => void
}

export const useClubStore = create<ClubStore>((set, get) => ({
    // Initial State
    clubs: [],
    activeClubId: null,
    isLoading: false,

    // Actions - Clubs Management
    addClub: (club) =>
        set((state) => ({
            clubs: [...state.clubs, club],
        })),

    setClubs: (clubs) =>
        set(() => ({
            clubs,
        })),

    removeClub: (clubId) =>
        set((state) => ({
            clubs: state.clubs.filter((c) => c.id !== clubId),
            activeClubId: state.activeClubId === clubId ? null : state.activeClubId,
        })),

    updateClub: (clubId, updates) =>
        set((state) => ({
            clubs: state.clubs.map((c) => (c.id === clubId ? { ...c, ...updates } : c)),
        })),

    clearClubs: () =>
        set(() => ({
            clubs: [],
            activeClubId: null,
        })),

    // Selectors
    getClubById: (clubId) => {
        return get().clubs.find((c) => c.id === clubId)
    },

    getClubsByCreator: (creatorId) => {
        return get().clubs.filter((c) => c.creator === creatorId)
    },

    get activeClub() {
        const state = get()
        if (!state.activeClubId) return null
        return state.clubs.find((c) => c.id === state.activeClubId) || null
    },

    // Active Club
    setActiveClub: (clubId) =>
        set(() => ({
            activeClubId: clubId,
        })),

    clearActiveClub: () =>
        set(() => ({
            activeClubId: null,
        })),

    // Loading State
    setLoading: (loading) =>
        set(() => ({
            isLoading: loading,
        })),
}))
