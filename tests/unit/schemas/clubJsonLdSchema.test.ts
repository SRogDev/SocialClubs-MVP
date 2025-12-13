/**
 * Unit tests for Club JSON-LD Schema Generation (TDD)
 */
import { generateClubJsonLd } from '@/schemas/clubJsonLdSchema'
import type { Club } from '@/types/club'

describe('generateClubJsonLd', () => {
    const mockClub: Club = {
        id: 'club-123',
        name: 'Club de Programación',
        bio: 'Un club para desarrolladores apasionados por la tecnología',
        logo: { url: 'https://example.com/logo.png' },
        color: '#f97316',
        level: 3,
        privacity: 'public',
        creator: 'user-123',
        tags: ['programación', 'desarrollo', 'tecnología'],
        total_members: 150,
        created_at: '2024-01-15T10:00:00Z',
    }

    describe('Basic JSON-LD Structure', () => {
        it('should generate valid Schema.org Organization structure', () => {
            // GIVEN: A club with complete data
            const club = mockClub

            // WHEN: Generating JSON-LD schema
            const jsonLd = generateClubJsonLd(club)

            // THEN: Should have correct Schema.org structure
            expect(jsonLd['@context']).toBe('https://schema.org')
            expect(jsonLd['@type']).toBe('Organization')
            expect(jsonLd['@id']).toContain(`/clubs/${club.id}`)
        })

        it('should include club name', () => {
            // GIVEN: A club with name
            const club = mockClub

            // WHEN: Generating JSON-LD schema
            const jsonLd = generateClubJsonLd(club)

            // THEN: Should include the club name
            expect(jsonLd.name).toBe(club.name)
        })

        it('should include club description from bio', () => {
            // GIVEN: A club with bio
            const club = mockClub

            // WHEN: Generating JSON-LD schema
            const jsonLd = generateClubJsonLd(club)

            // THEN: Should include bio as description
            expect(jsonLd.description).toBe(club.bio)
        })

        it('should include club URL', () => {
            // GIVEN: A club with id
            const club = mockClub

            // WHEN: Generating JSON-LD schema
            const jsonLd = generateClubJsonLd(club)

            // THEN: Should include correct URL
            expect(jsonLd.url).toContain(`/clubs/${club.id}`)
        })
    })

    describe('Logo and Images', () => {
        it('should include logo URL when logo exists', () => {
            // GIVEN: A club with logo
            const club = mockClub

            // WHEN: Generating JSON-LD schema
            const jsonLd = generateClubJsonLd(club)

            // THEN: Should include logo as ImageObject
            expect(jsonLd.logo).toBeDefined()
            expect(jsonLd.logo['@type']).toBe('ImageObject')
            expect(jsonLd.logo.url).toBe(club.logo.url)
        })

        it('should use default logo when club logo is null', () => {
            // GIVEN: A club without logo
            const club: Club = { ...mockClub, logo: null }

            // WHEN: Generating JSON-LD schema
            const jsonLd = generateClubJsonLd(club)

            // THEN: Should include default logo
            expect(jsonLd.logo).toBeDefined()
            expect(jsonLd.logo['@type']).toBe('ImageObject')
            expect(jsonLd.logo.url).toContain('/icons/icon-512.png')
        })

        it('should handle logo as string URL', () => {
            // GIVEN: A club with logo as string
            const club: Club = {
                ...mockClub,
                logo: 'https://example.com/direct-logo.png' as any,
            }

            // WHEN: Generating JSON-LD schema
            const jsonLd = generateClubJsonLd(club)

            // THEN: Should handle string URL correctly
            expect(jsonLd.logo.url).toBe('https://example.com/direct-logo.png')
        })
    })

    describe('Member Information', () => {
        it('should include number of members', () => {
            // GIVEN: A club with members
            const club = mockClub

            // WHEN: Generating JSON-LD schema
            const jsonLd = generateClubJsonLd(club)

            // THEN: Should include numberOfMembers
            expect(jsonLd.numberOfMembers).toBe(club.total_members)
        })

        it('should handle null total_members', () => {
            // GIVEN: A club without member count
            const club: Club = { ...mockClub, total_members: null }

            // WHEN: Generating JSON-LD schema
            const jsonLd = generateClubJsonLd(club)

            // THEN: Should default to 0 or omit the field
            expect(jsonLd.numberOfMembers).toBe(0)
        })
    })

    describe('Tags and Keywords', () => {
        it('should include tags as keywords', () => {
            // GIVEN: A club with tags
            const club = mockClub

            // WHEN: Generating JSON-LD schema
            const jsonLd = generateClubJsonLd(club)

            // THEN: Should include tags as keywords string
            expect(jsonLd.keywords).toBeDefined()
            expect(jsonLd.keywords).toContain('programación')
            expect(jsonLd.keywords).toContain('desarrollo')
            expect(jsonLd.keywords).toContain('tecnología')
        })

        it('should handle null tags', () => {
            // GIVEN: A club without tags
            const club: Club = { ...mockClub, tags: null }

            // WHEN: Generating JSON-LD schema
            const jsonLd = generateClubJsonLd(club)

            // THEN: Should handle null tags gracefully
            expect(jsonLd.keywords).toBeUndefined()
        })

        it('should handle empty tags array', () => {
            // GIVEN: A club with empty tags
            const club: Club = { ...mockClub, tags: [] }

            // WHEN: Generating JSON-LD schema
            const jsonLd = generateClubJsonLd(club)

            // THEN: Should handle empty array
            expect(jsonLd.keywords).toBeUndefined()
        })
    })

    describe('Dates', () => {
        it('should include founding date from created_at', () => {
            // GIVEN: A club with created_at date
            const club = mockClub

            // WHEN: Generating JSON-LD schema
            const jsonLd = generateClubJsonLd(club)

            // THEN: Should include foundingDate
            expect(jsonLd.foundingDate).toBe(club.created_at)
        })
    })

    describe('Additional Properties', () => {
        it('should include memberOf for club type', () => {
            // GIVEN: A club
            const club = mockClub

            // WHEN: Generating JSON-LD schema
            const jsonLd = generateClubJsonLd(club)

            // THEN: Should indicate it's part of the platform
            expect(jsonLd.memberOf).toBeDefined()
            expect(jsonLd.memberOf['@type']).toBe('Organization')
        })

        it('should include subjectOf for privacy setting', () => {
            // GIVEN: A public club
            const club = mockClub

            // WHEN: Generating JSON-LD schema
            const jsonLd = generateClubJsonLd(club)

            // THEN: Should indicate it's publicly accessible
            expect(jsonLd.isAccessibleForFree).toBe(true)
        })

        it('should mark private clubs as not free', () => {
            // GIVEN: A private club
            const club: Club = { ...mockClub, privacity: 'private' }

            // WHEN: Generating JSON-LD schema
            const jsonLd = generateClubJsonLd(club)

            // THEN: Should indicate it's not freely accessible
            expect(jsonLd.isAccessibleForFree).toBe(false)
        })
    })

    describe('Edge Cases', () => {
        it('should handle club with minimal data', () => {
            // GIVEN: A club with minimal required fields
            const minimalClub: Club = {
                id: 'club-456',
                name: 'Minimal Club',
                bio: null,
                logo: null,
                color: null,
                level: null,
                privacity: null,
                creator: null,
                tags: null,
                total_members: null,
                created_at: new Date().toISOString(),
            }

            // WHEN: Generating JSON-LD schema
            const jsonLd = generateClubJsonLd(minimalClub)

            // THEN: Should generate valid schema without errors
            expect(jsonLd['@type']).toBe('Organization')
            expect(jsonLd.name).toBe('Minimal Club')
            expect(jsonLd.logo).toBeDefined()
        })

        it('should sanitize and clean club name', () => {
            // GIVEN: A club with special characters in name
            const club: Club = {
                ...mockClub,
                name: 'Club de <script>alert("test")</script> Programación',
            }

            // WHEN: Generating JSON-LD schema
            const jsonLd = generateClubJsonLd(club)

            // THEN: Should sanitize name (basic check)
            expect(jsonLd.name).not.toContain('<script>')
        })
    })
})
