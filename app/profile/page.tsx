import { redirect } from 'next/navigation'
import { Suspense } from 'react'

import ProfileClient from '@/components/profile/profile-client'
import { Skeleton } from '@/components/ui/skeleton'
import { createClient } from '@/lib/supabase/server'
import { getUserProfile } from '@/services/userService'

function ProfileSkeleton() {
  return (
    <div className="container py-6 pb-24">
      <div className="flex flex-col items-center mb-6">
        <div className="w-full max-w-md p-6 flex flex-col items-center rounded-2xl border border-border/50 bg-card">
          <Skeleton className="w-[85%] aspect-square rounded-full" />
          <Skeleton className="h-6 w-32 mt-4" />
          <Skeleton className="h-4 w-24 mt-2" />
          <div className="flex items-center gap-4 mt-3">
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-5 w-16" />
          </div>
        </div>
      </div>
      <Skeleton className="h-40 w-full rounded-xl mb-6" />
      <div className="space-y-4">
        <Skeleton className="h-14 w-full rounded-xl" />
        <Skeleton className="h-14 w-full rounded-xl" />
        <Skeleton className="h-14 w-full rounded-xl" />
      </div>
    </div>
  )
}

async function ProfileData() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) redirect('/auth/login')

  const profile = await getUserProfile(user.id)

  if (!profile) redirect('/auth/login')

  // Fetch user subscriptions
  const { data: subscriptions } = await supabase
    .from('club_memberships')
    .select('id, club_id, clubs(name, logo, color)')
    .eq('user_id', user.id)

  // Fetch user points
  const { data: points } = await supabase
    .from('user_points')
    .select('superlikes')
    .eq('user', user.id)
    .single()

  const profileData = {
    name: profile.name || 'Usuario',
    username: profile.username || '',
    description: profile.bio || '',
    imageUrl: profile.avatar_url || '/placeholder.svg',
    subscriptions: subscriptions?.length ?? 0,
    socialCoins: 0,
    superlikes: points?.superlikes ?? 0,
  }

  const mappedSubscriptions = (subscriptions || []).map((sub: any) => ({
    id: sub.id?.toString() ?? '',
    clubName: sub.clubs?.name ?? 'Club',
    clubImage: sub.clubs?.logo?.url ?? '/placeholder.svg',
    channelName: '',
    price: 0,
    billingPeriod: 'monthly',
  }))

  return (
    <ProfileClient
      profile={profileData}
      subscriptions={mappedSubscriptions}
    />
  )
}

export default async function ProfilePage() {
  return (
    <Suspense fallback={<ProfileSkeleton />}>
      <ProfileData />
    </Suspense>
  )
}
