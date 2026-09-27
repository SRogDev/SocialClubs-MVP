/**
 * Unit tests for Club Link Generator
 * Following TDD and Given-When-Then pattern
 */

import { createClient } from '@/lib/supabase/server'
import { generateUniqueClubLink, getClubByLink } from '@/services/clubService'

// Mock Supabase
jest.mock('@/lib/supabase/server', () => ({
    createClient: jest.fn()
}))

describe('generateUniqueClubLink', () => {
    const mockSupabase = {
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn()
    }

    beforeEach(() => {
        jest.clearAllMocks()
            ; (createClient as jest.Mock).mockResolvedValue(mockSupabase)
    })

    it('should generate an 8-character alphanumeric string', async () => {
        // GIVEN: Database with no existing links
        mockSupabase.maybeSingle.mockResolvedValue({ data: null, error: null })

        // WHEN: Generating a club link
        const link = await generateUniqueClubLink()

        // THEN: Link should be 8 characters long and alphanumeric
        expect(link).toHaveLength(8)
        expect(link).toMatch(/^[A-Za-z0-9]{8}$/)
    })

    it('should retry if first generated link already exists', async () => {
        // GIVEN: First link exists in database, second one doesn't
        mockSupabase.maybeSingle
            .mockResolvedValueOnce({ data: { id: 'existing-id' }, error: null })
            .mockResolvedValueOnce({ data: null, error: null })

        // WHEN: Generating a club link
        const link = await generateUniqueClubLink()

        // THEN: Should have checked database twice
        expect(mockSupabase.maybeSingle).toHaveBeenCalledTimes(2)
        expect(link).toHaveLength(8)
    })

    it('should throw error if database check fails', async () => {
        // GIVEN: Database query returns an error
        mockSupabase.maybeSingle.mockResolvedValue({
            data: null,
            error: { message: 'Database error' }
        })

        // WHEN/THEN: Generating a link should throw
        await expect(generateUniqueClubLink()).rejects.toThrow(
            'Failed to generate unique club link'
        )
    })

    it('should generate different links on multiple calls', async () => {
        // GIVEN: Clean database
        mockSupabase.maybeSingle.mockResolvedValue({ data: null, error: null })

        // WHEN: Generating multiple links
        const link1 = await generateUniqueClubLink()
        const link2 = await generateUniqueClubLink()
        const link3 = await generateUniqueClubLink()

        // THEN: All links should be different (high probability with 62^8 combinations)
        expect(link1).not.toBe(link2)
        expect(link2).not.toBe(link3)
        expect(link1).not.toBe(link3)
    })
})

describe('getClubByLink', () => {
    const mockSupabase = {
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn()
    }

    const mockClub = {
        id: 'club-123',
        name: 'Test Club',
        club_link: 'aB3xK9mQ',
        created_at: '2025-12-23T00:00:00Z'
    }

    beforeEach(() => {
        jest.clearAllMocks()
            ; (createClient as jest.Mock).mockResolvedValue(mockSupabase)
    })

    it('should return club when valid link is provided', async () => {
        // GIVEN: Database contains a club with the link
        mockSupabase.single.mockResolvedValue({ data: mockClub, error: null })

        // WHEN: Fetching club by link
        const club = await getClubByLink('aB3xK9mQ')

        // THEN: Should return the club
        expect(club).toEqual(mockClub)
        expect(mockSupabase.eq).toHaveBeenCalledWith('club_link', 'aB3xK9mQ')
    })

    it('should return null when link does not exist', async () => {
        // GIVEN: Database does not contain the link
        mockSupabase.single.mockResolvedValue({
            data: null,
            error: { message: 'Not found' }
        })

        // WHEN: Fetching club by non-existent link
        const club = await getClubByLink('nonExist')

        // THEN: Should return null
        expect(club).toBeNull()
    })

    it('should return null when database error occurs', async () => {
        // GIVEN: Database query fails
        mockSupabase.single.mockResolvedValue({
            data: null,
            error: { message: 'Database error' }
        })

        // WHEN: Fetching club by link
        const club = await getClubByLink('aB3xK9mQ')

        // THEN: Should return null and log error
        expect(club).toBeNull()
    })
})
