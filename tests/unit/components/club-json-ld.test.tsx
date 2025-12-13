/**
 * Integration test for ClubJsonLd component (TDD)
 */
import { render } from '@testing-library/react'
import ClubJsonLd from '@/components/club-json-ld'
import type { Club } from '@/types/club'

describe('ClubJsonLd Component', () => {
    const mockClub: Club = {
        id: 'club-123',
        name: 'Club de Programación',
        bio: 'Un club para desarrolladores',
        logo: { url: 'https://example.com/logo.png' },
        color: '#f97316',
        level: 3,
        privacity: 'public',
        creator: 'user-123',
        tags: ['programación', 'desarrollo'],
        total_members: 150,
        created_at: '2024-01-15T10:00:00Z',
    }

    it('should render script tag with JSON-LD', () => {
        // GIVEN: A club
        const club = mockClub

        // WHEN: Component is rendered
        const { container } = render(<ClubJsonLd club={club} />)

        // THEN: Should render script tag
        const script = container.querySelector('script[type="application/ld+json"]')
        expect(script).toBeInTheDocument()
    })

    it('should contain valid JSON in script tag', () => {
        // GIVEN: A club
        const club = mockClub

        // WHEN: Component is rendered
        const { container } = render(<ClubJsonLd club={club} />)

        // THEN: Script content should be valid JSON
        const script = container.querySelector('script[type="application/ld+json"]')
        expect(script).toBeInTheDocument()

        const content = script?.innerHTML
        expect(() => JSON.parse(content || '')).not.toThrow()
    })

    it('should include club data in JSON-LD', () => {
        // GIVEN: A club
        const club = mockClub

        // WHEN: Component is rendered
        const { container } = render(<ClubJsonLd club={club} />)

        // THEN: JSON should contain club data
        const script = container.querySelector('script[type="application/ld+json"]')
        const jsonLd = JSON.parse(script?.innerHTML || '{}')

        expect(jsonLd['@type']).toBe('Organization')
        expect(jsonLd.name).toBe(club.name)
        expect(jsonLd.description).toBe(club.bio)
        expect(jsonLd.numberOfMembers).toBe(club.total_members)
    })

    it('should not render multiple script tags', () => {
        // GIVEN: A club
        const club = mockClub

        // WHEN: Component is rendered
        const { container } = render(<ClubJsonLd club={club} />)

        // THEN: Should have only one script tag
        const scripts = container.querySelectorAll('script[type="application/ld+json"]')
        expect(scripts).toHaveLength(1)
    })

    it('should handle club with minimal data', () => {
        // GIVEN: A club with minimal data
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

        // WHEN: Component is rendered
        const { container } = render(<ClubJsonLd club={minimalClub} />)

        // THEN: Should render without errors
        const script = container.querySelector('script[type="application/ld+json"]')
        expect(script).toBeInTheDocument()

        const jsonLd = JSON.parse(script?.innerHTML || '{}')
        expect(jsonLd['@type']).toBe('Organization')
        expect(jsonLd.name).toBe('Minimal Club')
    })

    it('should re-render when club data changes', () => {
        // GIVEN: Initial club
        const initialClub = mockClub

        // WHEN: Component is rendered and then updated
        const { container, rerender } = render(<ClubJsonLd club={initialClub} />)

        const updatedClub = { ...mockClub, name: 'Updated Club Name' }
        rerender(<ClubJsonLd club={updatedClub} />)

        // THEN: JSON-LD should reflect new data
        const script = container.querySelector('script[type="application/ld+json"]')
        const jsonLd = JSON.parse(script?.innerHTML || '{}')

        expect(jsonLd.name).toBe('Updated Club Name')
    })
})
