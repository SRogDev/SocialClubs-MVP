import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import HomeList from '@/components/home-clubs/home-list'
import CreateClubLink from '@/components/create-club-link'
import { getUserClubs } from '@/services/clubService'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

function HomeListSkeleton() {
  return (
    <div className="space-y-3">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-4 rounded-xl border border-border/50 bg-card">
          <Skeleton className="h-14 w-14 rounded-full flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-56" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
      ))}
    </div>
  )
}

async function ClubsList() {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) redirect('/auth/login')

  const clubsFromDb = await getUserClubs(user.id)

  const userClubs = (clubsFromDb || []).map((club) => ({
    id: club.id,
    name: club.name || 'Club sin nombre',
    image: (club.logo as { url?: string })?.url || '/placeholder.svg?height=60&width=60',
    color: club.color || '#f97316',
    members: club.total_members || 0,
    level: club.level || 1,
    lastContent: {
      type: 'text' as const,
      preview: 'Nuevo contenido disponible',
      time: 'ahora',
    },
  }))

  if (userClubs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4 text-center px-6">
        <div className="p-5 rounded-2xl bg-primary/5 border border-primary/10">
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary/60"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" x2="19" y1="8" y2="14"/><line x1="22" x2="16" y1="11" y2="11"/></svg>
        </div>
        <div className="space-y-1.5 max-w-xs">
          <h3 className="font-semibold text-lg">Aún no perteneces a ningún club</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Explora los clubes disponibles y únete al que más te interese.
          </p>
        </div>
        <Link href="/explore">
          <Button className="mt-2">Explorar clubes</Button>
        </Link>
      </div>
    )
  }

  return (
    <>
      <HomeList clubs={userClubs} />
      <div className="pt-6">
        <CreateClubLink />
      </div>
    </>
  )
}

export default function ClubsPage() {
  return (
    <div className="min-h-screen bg-background pb-24 md:ml-0">
      <div className="container max-w-2xl mx-auto py-6 px-4">
        <Suspense fallback={<HomeListSkeleton />}>
          <ClubsList />
        </Suspense>
      </div>
    </div>
  )
}

