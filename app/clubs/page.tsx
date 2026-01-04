import { redirect } from "next/navigation"

import { createClient } from "@/lib/supabase/server"
import HomeList from "@/components/home-clubs/home-list"
import CreateClubLink from "@/components/create-club-link"

import { getUserClubs } from "@/services/clubService"
import mockClubs from "@/mock-data/clubs-mock-home.json"

export default async function ClubsPage() {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    redirect("/auth/login")
  }

  // Try to get user's clubs from Supabase, fallback to mock data
  let userClubs = mockClubs
  try {
    const clubsFromDb = await getUserClubs(user.id)
    if (clubsFromDb && clubsFromDb.length > 0) {
      // Transform database clubs to match the expected format
      userClubs = clubsFromDb.map(club => ({
        id: club.id,
        name: club.name || 'Club sin nombre',
        image: club.logo?.url || '/placeholder.svg?height=60&width=60',
        color: club.color || '#f97316',
        members: club.total_members || 0,
        level: club.level || 1,
        lastContent: {
          type: 'text' as const,
          preview: 'Nuevo contenido disponible',
          time: 'ahora'
        }
      }))
    }
  } catch (error) {
    console.error('Error fetching user clubs:', error)
    // Keep using mock data as fallback
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="container max-w-2xl mx-auto py-6">
        <div className="mb-6">
          <HomeList clubs={userClubs} />
        </div>

        <div className="pt-4">
          <CreateClubLink />
        </div>
      </div>
    </div>
  )
}
