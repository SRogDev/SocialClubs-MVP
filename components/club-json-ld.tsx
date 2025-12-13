/**
 * ClubJsonLd Component
 * Renders JSON-LD structured data for a club to improve SEO
 * 
 * Usage:
 * ```tsx
 * import ClubJsonLd from '@/components/club-json-ld'
 * 
 * export default function ClubPage({ club }) {
 *   return (
 *     <>
 *       <ClubJsonLd club={club} />
 *       <div>Club content...</div>
 *     </>
 *   )
 * }
 * ```
 */

import type { Club } from '@/types/club'
import { generateClubJsonLd } from '@/schemas/clubJsonLdSchema'

interface ClubJsonLdProps {
    club: Club
}

export default function ClubJsonLd({ club }: ClubJsonLdProps) {
    const jsonLd = generateClubJsonLd(club)

    return (
        <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
    )
}
