import { notFound } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { getClubById, isUserClubMember } from "@/services/clubService"
import ClubHeader from "@/components/info-club/club-header"
import ClubEditButton from "@/components/info-club/club-edit-button"
import ClubInteractiveWrapper from "@/components/info-club/club-interactive-wrapper"
import ClubDescription from "@/components/info-club/club-description"
import InviteLinkCard from "@/components/info-club/invite-link-card"
import ClubTags from "@/components/info-club/club-tags"
import ClubStats from "@/components/info-club/club-stats"
import ClubVisitorCTA from "@/components/info-club/ClubVisitorCTA"

interface PageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<{ invite?: string }>
}

export default async function ClubInfoPage({ params, searchParams }: PageProps) {
  const { id } = await params
  const { invite } = await searchParams

  const supabase = await createClient()

  const [club, { data: authData }] = await Promise.all([
    getClubById(id),
    supabase.auth.getUser(),
  ])

  if (!club) notFound()

  const user = authData.user
  const isCreator = user?.id === club.creator
  const isMember = isCreator || (user ? await isUserClubMember(user.id, id) : false)

  // Derive display-friendly values from the real Club type
  const clubColor = club.color ?? "#f97316"
  const clubName = club.name ?? "Club"
  const clubLogoUrl =
    club.logo && typeof club.logo === "object" && "url" in club.logo
      ? (club.logo.url as string)
      : "/placeholder.svg"

  const tags = Array.isArray(club.tags) ? (club.tags as string[]) : []
  const createdAt = new Date(club.created_at).toLocaleDateString("es-ES", {
    month: "long",
    year: "numeric",
  })

  return (
    <div className="container py-6 space-y-6 max-w-lg mx-auto">
      {/* Back button */}
      <div className="mb-4">
        <Link
          href={`/clubs/${id}`}
          className="flex items-center text-muted-foreground hover:text-foreground group"
        >
          <ArrowLeft size={18} className="mr-1 group-hover:-translate-x-1 transition-transform" />
          <span>Volver</span>
        </Link>
      </div>

      {/* Header with conditional edit button */}
      <div className="relative">
        {isCreator && <ClubEditButton clubId={id} />}
        <ClubHeader
          club={{
            name: clubName,
            imageUrl: clubLogoUrl,
            color: clubColor,
            level: club.level ?? 1,
          }}
        />
      </div>

      {/* CTA for visitors (non-members) */}
      {!isMember && (
        <ClubVisitorCTA
          clubId={id}
          clubName={clubName}
          clubColor={clubColor}
          inviteCode={invite ?? club.club_link ?? null}
          userId={user?.id ?? null}
        />
      )}

      {/* Interactive actions (tip, notifications) — only for members */}
      {isMember && (
        <ClubInteractiveWrapper
          clubName={clubName}
          clubColor={clubColor}
          initialSocialCoins={0}
        />
      )}

      {/* Description */}
      <ClubDescription
        description={club.bio ?? ""}
        members={club.total_members ?? 0}
        createdAt={createdAt}
        color={clubColor}
      />

      {/* Invite link — only for members */}
      {isMember && club.club_link && (
        <InviteLinkCard club={club as any} color={clubColor} />
      )}

      {/* Tags */}
      {tags.length > 0 && (
        <ClubTags tags={tags} color={clubColor} />
      )}

      {/* Stats */}
      <ClubStats consultations={0} newMembersThisMonth={0} color={clubColor} />
    </div>
  )
}

