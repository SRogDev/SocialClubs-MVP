/**
 * Example: Club Page with JSON-LD Integration
 * 
 * This is an example of how to integrate ClubJsonLd component
 * in a real club page with proper data fetching.
 * 
 * Copy this pattern to your actual club pages.
 */

import type { Metadata } from 'next'

import ClubJsonLd from '@/components/club-json-ld'
import { getClubById } from '@/services/clubService'
import type { Club } from '@/types/club'

// Generate metadata for SEO
export async function generateMetadata({
    params
}: {
    params: { id: string }
}): Promise<Metadata> {
    try {
        const club = await getClubById(params.id)

        if (!club) {
            return {
                title: 'Club no encontrado',
            }
        }

        const logoUrl = typeof club.logo === 'object' && club.logo?.url
            ? club.logo.url
            : '/icons/icon-512.png'

        return {
            title: club.name || 'Club',
            description: club.bio || 'Únete a esta comunidad en SocialClubs',
            keywords: Array.isArray(club.tags) ? club.tags.join(', ') : '',
            openGraph: {
                title: club.name || 'Club',
                description: club.bio || '',
                images: [logoUrl],
                type: 'website',
            },
            twitter: {
                card: 'summary_large_image',
                title: club.name || 'Club',
                description: club.bio || '',
                images: [logoUrl],
            },
        }
    } catch (error) {
        console.error('Error generating metadata:', error)
        return {
            title: 'Club',
        }
    }
}

// Server Component - fetches data on server
export default async function ClubPageExample({
    params
}: {
    params: { id: string }
}) {
    const club = await getClubById(params.id)

    if (!club) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <h1 className="text-2xl font-bold mb-2">Club no encontrado</h1>
                    <p className="text-muted-foreground">
                        El club que buscas no existe o ha sido eliminado.
                    </p>
                </div>
            </div>
        )
    }

    return (
        <>
            {/* JSON-LD for SEO - Critical for search engines */}
            <ClubJsonLd club={club} />

            {/* Main content */}
            <div className="container mx-auto px-4 py-8">
                {/* Club Header */}
                <header className="mb-8">
                    <div className="flex items-center gap-4">
                        {club.logo && (
                            <img
                                src={typeof club.logo === 'object' ? club.logo.url : club.logo}
                                alt={club.name || 'Club logo'}
                                className="w-20 h-20 rounded-full object-cover"
                            />
                        )}
                        <div>
                            <h1 className="text-3xl font-bold">{club.name}</h1>
                            <p className="text-muted-foreground">
                                {club.total_members || 0} miembros
                            </p>
                        </div>
                    </div>

                    {club.bio && (
                        <p className="mt-4 text-lg">{club.bio}</p>
                    )}

                    {club.tags && Array.isArray(club.tags) && club.tags.length > 0 && (
                        <div className="mt-4 flex flex-wrap gap-2">
                            {club.tags.map((tag, index) => (
                                <span
                                    key={index}
                                    className="px-3 py-1 bg-secondary rounded-full text-sm"
                                >
                                    {tag}
                                </span>
                            ))}
                        </div>
                    )}
                </header>

                {/* Club Content */}
                <main>
                    <div className="grid gap-4">
                        {/* Your club content here */}
                        <div className="p-6 border rounded-lg">
                            <h2 className="text-xl font-semibold mb-2">Acerca de este club</h2>
                            <p className="text-muted-foreground">
                                {club.bio || 'Este club aún no tiene descripción.'}
                            </p>
                        </div>

                        <div className="p-6 border rounded-lg">
                            <h2 className="text-xl font-semibold mb-2">Estadísticas</h2>
                            <ul className="space-y-2">
                                <li>
                                    <strong>Miembros:</strong> {club.total_members || 0}
                                </li>
                                <li>
                                    <strong>Nivel:</strong> {club.level || 'N/A'}
                                </li>
                                <li>
                                    <strong>Privacidad:</strong>{' '}
                                    {club.privacity === 'public' ? 'Público' : 'Privado'}
                                </li>
                                <li>
                                    <strong>Creado:</strong>{' '}
                                    {new Date(club.created_at).toLocaleDateString('es-ES')}
                                </li>
                            </ul>
                        </div>
                    </div>
                </main>
            </div>
        </>
    )
}

/**
 * Alternative: Client Component Version
 * Use this if you need client-side features like state management
 */

/*
'use client'

import { useEffect, useState } from 'react'
import ClubJsonLd from '@/components/club-json-ld'
import type { Club } from '@/types/club'

export default function ClubPageClientExample({ 
  params 
}: { 
  params: { id: string } 
}) {
  const [club, setClub] = useState<Club | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadClub() {
      try {
        const response = await fetch(`/api/clubs/${params.id}`)
        const data = await response.json()
        setClub(data)
      } catch (error) {
        console.error('Error loading club:', error)
      } finally {
        setLoading(false)
      }
    }

    loadClub()
  }, [params.id])

  if (loading) {
    return <div>Cargando...</div>
  }

  if (!club) {
    return <div>Club no encontrado</div>
  }

  return (
    <>
      <ClubJsonLd club={club} />
      <div>
        {/* Your client-side club content *\/}
      </div>
    </>
  )
}
*/

/**
 * With SWR for data fetching
 */

/*
'use client'

import useSWR from 'swr'
import ClubJsonLd from '@/components/club-json-ld'
import type { Club } from '@/types/club'

const fetcher = (url: string) => fetch(url).then(res => res.json())

export default function ClubPageSWRExample({ 
  params 
}: { 
  params: { id: string } 
}) {
  const { data: club, error, isLoading } = useSWR<Club>(
    `/api/clubs/${params.id}`,
    fetcher
  )

  if (error) return <div>Error al cargar el club</div>
  if (isLoading) return <div>Cargando...</div>
  if (!club) return <div>Club no encontrado</div>

  return (
    <>
      <ClubJsonLd club={club} />
      <div>
        {/* Your club content with SWR *\/}
      </div>
    </>
  )
}
*/
