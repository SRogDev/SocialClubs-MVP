/**
 * Club JSON-LD Schema Generator
 * Generates Schema.org Organization structured data for clubs
 * to improve SEO and rich snippets in search results
 */

import { siteConfig } from '@/lib/seo-config'
import type { Club } from '@/types/club'

interface ClubJsonLd {
    '@context': string
    '@type': 'Organization'
    '@id': string
    name: string
    description?: string
    url: string
    logo: {
        '@type': 'ImageObject'
        url: string
    }
    numberOfMembers?: number
    keywords?: string
    foundingDate: string
    memberOf: {
        '@type': 'Organization'
        name: string
        url: string
    }
    isAccessibleForFree: boolean
}

/**
 * Sanitizes a string by removing HTML tags and special characters
 */
function sanitizeString(str: string | null | undefined): string {
    if (!str) return ''
    return str.replace(/<[^>]*>/g, '').trim()
}

/**
 * Extracts logo URL from club logo object or string
 */
function getLogoUrl(logo: Club['logo']): string {
    if (!logo) {
        return `${siteConfig.url}/icons/icon-512.png`
    }

    // Handle string URL
    if (typeof logo === 'string') {
        return logo
    }

    // Handle object with url property
    if (typeof logo === 'object' && 'url' in logo && logo.url) {
        return logo.url
    }

    // Fallback to default
    return `${siteConfig.url}/icons/icon-512.png`
}

/**
 * Converts tags array to keywords string
 */
function formatKeywords(tags: Club['tags']): string | undefined {
    if (!tags || !Array.isArray(tags) || tags.length === 0) {
        return undefined
    }

    return tags.join(', ')
}

/**
 * Determines if club is freely accessible based on privacy setting
 */
function isAccessibleForFree(privacity: Club['privacity']): boolean {
    return privacity !== 'private'
}

/**
 * Generates Schema.org Organization JSON-LD for a club
 * 
 * @param club - Club data from database
 * @returns JSON-LD structured data object
 * 
 * @example
 * ```typescript
 * const club = await getClubById('club-123')
 * const jsonLd = generateClubJsonLd(club)
 * 
 * // Use in component:
 * <script 
 *   type="application/ld+json" 
 *   dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} 
 * />
 * ```
 */
export function generateClubJsonLd(club: Club): ClubJsonLd {
    const clubUrl = `${siteConfig.url}/clubs/${club.id}`
    const logoUrl = getLogoUrl(club.logo)
    const keywords = formatKeywords(club.tags)
    const cleanName = sanitizeString(club.name)
    const cleanBio = sanitizeString(club.bio)

    const jsonLd: ClubJsonLd = {
        '@context': 'https://schema.org',
        '@type': 'Organization',
        '@id': clubUrl,
        name: cleanName || 'Club',
        url: clubUrl,
        logo: {
            '@type': 'ImageObject',
            url: logoUrl,
        },
        numberOfMembers: club.total_members || 0,
        foundingDate: club.created_at,
        memberOf: {
            '@type': 'Organization',
            name: siteConfig.name,
            url: siteConfig.url,
        },
        isAccessibleForFree: isAccessibleForFree(club.privacity),
    }

    // Add optional fields only if they exist
    if (cleanBio) {
        jsonLd.description = cleanBio
    }

    if (keywords) {
        jsonLd.keywords = keywords
    }

    return jsonLd
}
