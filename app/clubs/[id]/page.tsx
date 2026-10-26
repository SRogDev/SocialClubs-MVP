import { notFound } from 'next/navigation'
import { Suspense } from 'react'

import { gameSummary, type GameSummary } from '@/app/api/games/shared'
import { ClubPageClient } from '@/components/club/club-page-client'
import { ClubPageSkeleton } from '@/components/club/club-page-skeleton'
import { AI_MINIGAME_RUNTIME, isEnabled } from '@/lib/ai/flags'
import { defaultGameService } from '@/lib/games/service'
import { createClient } from '@/lib/supabase/server'
import { getClubById, isUserClubMember } from '@/services/clubService'
import { getPosts } from '@/services/postService'

interface PageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<{ joined?: string }>
}

async function ClubData({ id, joined }: { id: string; joined: boolean }) {
  const supabase = await createClient()

  const [club, { data: authData }] = await Promise.all([
    getClubById(id),
    supabase.auth.getUser(),
  ])

  if (!club) notFound()

  const user = authData.user
  const isCreator = user?.id === club.creator
  const isMember = isCreator || (user ? await isUserClubMember(user.id, id) : false)

  const [{ data: channels }, posts] = await Promise.all([
    supabase
      .from('channels')
      .select('*')
      .eq('club_id', id)
      .order('id', { ascending: true }),
    getPosts(id).catch(() => []),
  ])

  // Minijuegos publicados (flag AI_MINIGAME_RUNTIME): best-effort — a
  // games backend failure must never break the club home.
  let publishedGames: GameSummary[] = []
  if (isMember && isEnabled(AI_MINIGAME_RUNTIME)) {
    try {
      const rows = await defaultGameService().listLibrary(id, 'published')
      publishedGames = rows.map(gameSummary)
    } catch {
      publishedGames = []
    }
  }

  return (
    <ClubPageClient
      club={club}
      channels={channels || []}
      isMember={isMember}
      isCreator={isCreator}
      userId={user?.id ?? null}
      initialPosts={posts}
      showPwaPrompt={joined}
      publishedGames={publishedGames}
    />
  )
}

export default async function ClubPage({ params, searchParams }: PageProps) {
  const { id } = await params
  const { joined } = await searchParams
  return (
    <Suspense fallback={<ClubPageSkeleton />}>
      <ClubData id={id} joined={joined === 'true'} />
    </Suspense>
  )
}


