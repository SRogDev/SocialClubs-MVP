/**
 * Unit tests for Club Store (TDD)
 */
import { renderHook, act } from '@testing-library/react'

import { useClubStore } from '@/stores/clubStore'
import type { Club } from '@/types/club'

describe('useClubStore', () => {
    beforeEach(() => {
        // Reset store before each test
        const { result } = renderHook(() => useClubStore())
        act(() => {
            result.current.clearClubs()
        })
    })

    describe('Clubs Management', () => {
        it('should initialize with empty clubs', () => {
            // GIVEN: Fresh store instance
            const { result } = renderHook(() => useClubStore())

            // WHEN: Store is accessed
            const clubs = result.current.clubs

            // THEN: Clubs array should be empty
            expect(clubs).toEqual([])
        })

        it('should add a single club', () => {
            // GIVEN: A new club
            const { result } = renderHook(() => useClubStore())
            const newClub: Club = {
                id: '1',
                name: 'Test Club',
                logo: { url: 'test.jpg' },
                bio: 'Test bio',
                color: '#FF0000',
                level: 1,
                privacity: 'public',
                creator: 'user-1',
                tags: ['test'],
                total_members: 10,
                created_at: new Date().toISOString(),
            }

            // WHEN: Club is added
            act(() => {
                result.current.addClub(newClub)
            })

            // THEN: Club should be in the store
            expect(result.current.clubs).toHaveLength(1)
            expect(result.current.clubs[0]).toEqual(newClub)
        })

        it('should add multiple clubs', () => {
            // GIVEN: Multiple clubs
            const { result } = renderHook(() => useClubStore())
            const clubs: Club[] = [
                {
                    id: '1',
                    name: 'Club 1',
                    logo: null,
                    bio: 'Bio 1',
                    color: '#FF0000',
                    level: 1,
                    privacity: 'public',
                    creator: 'user-1',
                    tags: null,
                    total_members: 10,
                    created_at: new Date().toISOString(),
                },
                {
                    id: '2',
                    name: 'Club 2',
                    logo: null,
                    bio: 'Bio 2',
                    color: '#00FF00',
                    level: 2,
                    privacity: 'private',
                    creator: 'user-2',
                    tags: null,
                    total_members: 20,
                    created_at: new Date().toISOString(),
                },
            ]

            // WHEN: Clubs are added in batch
            act(() => {
                result.current.setClubs(clubs)
            })

            // THEN: All clubs should be in the store
            expect(result.current.clubs).toHaveLength(2)
            expect(result.current.clubs).toEqual(clubs)
        })

        it('should remove a club by id', () => {
            // GIVEN: Store with clubs
            const { result } = renderHook(() => useClubStore())
            const clubs: Club[] = [
                {
                    id: '1',
                    name: 'Club 1',
                    logo: null,
                    bio: 'Bio 1',
                    color: '#FF0000',
                    level: 1,
                    privacity: 'public',
                    creator: 'user-1',
                    tags: null,
                    total_members: 10,
                    created_at: new Date().toISOString(),
                },
                {
                    id: '2',
                    name: 'Club 2',
                    logo: null,
                    bio: 'Bio 2',
                    color: '#00FF00',
                    level: 2,
                    privacity: 'private',
                    creator: 'user-2',
                    tags: null,
                    total_members: 20,
                    created_at: new Date().toISOString(),
                },
            ]

            act(() => {
                result.current.setClubs(clubs)
            })

            // WHEN: A club is removed
            act(() => {
                result.current.removeClub('1')
            })

            // THEN: Club should be removed from store
            expect(result.current.clubs).toHaveLength(1)
            expect(result.current.clubs[0].id).toBe('2')
        })

        it('should update a club', () => {
            // GIVEN: Store with a club
            const { result } = renderHook(() => useClubStore())
            const club: Club = {
                id: '1',
                name: 'Original Name',
                logo: null,
                bio: 'Original bio',
                color: '#FF0000',
                level: 1,
                privacity: 'public',
                creator: 'user-1',
                tags: null,
                total_members: 10,
                created_at: new Date().toISOString(),
            }

            act(() => {
                result.current.addClub(club)
            })

            // WHEN: Club is updated
            act(() => {
                result.current.updateClub('1', { name: 'Updated Name', bio: 'Updated bio' })
            })

            // THEN: Club should be updated in store
            expect(result.current.clubs[0].name).toBe('Updated Name')
            expect(result.current.clubs[0].bio).toBe('Updated bio')
        })

        it('should get a club by id', () => {
            // GIVEN: Store with clubs
            const { result } = renderHook(() => useClubStore())
            const club: Club = {
                id: '1',
                name: 'Test Club',
                logo: null,
                bio: 'Test bio',
                color: '#FF0000',
                level: 1,
                privacity: 'public',
                creator: 'user-1',
                tags: null,
                total_members: 10,
                created_at: new Date().toISOString(),
            }

            act(() => {
                result.current.addClub(club)
            })

            // WHEN: Getting club by id
            const foundClub = result.current.getClubById('1')

            // THEN: Should return the correct club
            expect(foundClub).toEqual(club)
        })

        it('should return undefined for non-existent club id', () => {
            // GIVEN: Store with clubs
            const { result } = renderHook(() => useClubStore())

            // WHEN: Getting non-existent club
            const foundClub = result.current.getClubById('non-existent')

            // THEN: Should return undefined
            expect(foundClub).toBeUndefined()
        })
    })

    describe('Active Club', () => {
        it('should set and get active club', () => {
            // GIVEN: Store with clubs
            const { result } = renderHook(() => useClubStore())
            const club: Club = {
                id: '1',
                name: 'Test Club',
                logo: null,
                bio: 'Test bio',
                color: '#FF0000',
                level: 1,
                privacity: 'public',
                creator: 'user-1',
                tags: null,
                total_members: 10,
                created_at: new Date().toISOString(),
            }

            act(() => {
                result.current.addClub(club)
            })

            // WHEN: Setting active club
            act(() => {
                result.current.setActiveClub('1')
            })

            // THEN: Active club should be set
            expect(result.current.activeClubId).toBe('1')
            expect(result.current.activeClub).toEqual(club)
        })

        it('should clear active club', () => {
            // GIVEN: Store with active club
            const { result } = renderHook(() => useClubStore())

            act(() => {
                result.current.setActiveClub('1')
            })

            // WHEN: Clearing active club
            act(() => {
                result.current.clearActiveClub()
            })

            // THEN: Active club should be null
            expect(result.current.activeClubId).toBeNull()
            expect(result.current.activeClub).toBeNull()
        })
    })

    describe('Clubs Filtering', () => {
        it('should get clubs by creator', () => {
            // GIVEN: Clubs from different creators
            const { result } = renderHook(() => useClubStore())
            const clubs: Club[] = [
                {
                    id: '1',
                    name: 'Club 1',
                    logo: null,
                    bio: 'Bio 1',
                    color: '#FF0000',
                    level: 1,
                    privacity: 'public',
                    creator: 'user-1',
                    tags: null,
                    total_members: 10,
                    created_at: new Date().toISOString(),
                },
                {
                    id: '2',
                    name: 'Club 2',
                    logo: null,
                    bio: 'Bio 2',
                    color: '#00FF00',
                    level: 2,
                    privacity: 'private',
                    creator: 'user-2',
                    tags: null,
                    total_members: 20,
                    created_at: new Date().toISOString(),
                },
                {
                    id: '3',
                    name: 'Club 3',
                    logo: null,
                    bio: 'Bio 3',
                    color: '#0000FF',
                    level: 1,
                    privacity: 'public',
                    creator: 'user-1',
                    tags: null,
                    total_members: 15,
                    created_at: new Date().toISOString(),
                },
            ]

            act(() => {
                result.current.setClubs(clubs)
            })

            // WHEN: Filtering clubs by creator
            const userClubs = result.current.getClubsByCreator('user-1')

            // THEN: Should return only clubs from that creator
            expect(userClubs).toHaveLength(2)
            expect(userClubs.every((c) => c.creator === 'user-1')).toBe(true)
        })
    })

    describe('Loading State', () => {
        it('should manage loading state', () => {
            // GIVEN: Store initialized
            const { result } = renderHook(() => useClubStore())

            // WHEN: Loading state is set
            act(() => {
                result.current.setLoading(true)
            })

            // THEN: Loading should be true
            expect(result.current.isLoading).toBe(true)

            // WHEN: Loading state is cleared
            act(() => {
                result.current.setLoading(false)
            })

            // THEN: Loading should be false
            expect(result.current.isLoading).toBe(false)
        })
    })
})
