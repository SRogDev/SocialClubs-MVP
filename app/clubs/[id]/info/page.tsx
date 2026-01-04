import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import ClubHeader from "@/components/info-club/club-header"
import ClubEditButton from "@/components/info-club/club-edit-button"
import ClubInteractiveWrapper from "@/components/info-club/club-interactive-wrapper"
import ClubDescription from "@/components/info-club/club-description"
import InviteLinkCard from "@/components/info-club/invite-link-card"
import ClubTags from "@/components/info-club/club-tags"
import ClubHighlights from "@/components/info-club/club-highlights"
import ClubRewards from "@/components/info-club/club-rewards"
import ClubStats from "@/components/info-club/club-stats"

// Mock data — replace with real fetch later
const mockClub = {
  id: "1",
  name: "Programación",
  imageUrl: "/placeholder.svg?height=100&width=100",
  description:
    "Comunidad dedicada a compartir conocimientos y recursos sobre programación, desarrollo web y tecnologías emergentes. Aquí encontrarás desde tutoriales básicos hasta discusiones avanzadas sobre arquitectura de software.",
  members: 1250,
  createdAt: "Enero 2023",
  level: 8,
  isAdmin: true,
  color: "#f97316",
  club_link: "prog123", // Mock club link
  tags: ["JavaScript", "React", "Node.js", "TypeScript", "Web Dev"],
  highlights: [
    { id: "1", title: "Tutorial", imageUrl: "/placeholder.svg?height=60&width=60" },
    { id: "2", title: "Proyecto", imageUrl: "/placeholder.svg?height=60&width=60" },
    { id: "3", title: "Tip", imageUrl: "/placeholder.svg?height=60&width=60" },
    { id: "4", title: "Recurso", imageUrl: "/placeholder.svg?height=60&width=60" },
  ],
  rewards: [
    { id: "1", title: "Suscripción Premium", points: 100, icon: "💎" },
    { id: "2", title: "Consulta Gratis", points: 250, icon: "📞" },
    { id: "3", title: "Acceso Beta", points: 500, icon: "🧪" },
  ],
  consultations: 47,
  newMembersThisMonth: 89,
}

const mockUser = {
  socialCoins: 120,
}

export default async function ClubInfoPage({ params }: { params: { id: string } }) {
  // TODO: Fetch real club data
  // const club = await getClubById(params.id)
  // const user = await getCurrentUser()

  return (
    <div className="container py-6 space-y-6">
      {/* Back button */}
      <div className="mb-4">
        <Link
          href={`/clubs/${params.id}`}
          className="flex items-center text-muted-foreground hover:text-foreground group"
        >
          <ArrowLeft size={18} className="mr-1 group-hover:-translate-x-1 transition-transform" />
          <span>Volver</span>
        </Link>
      </div>

      {/* Header with edit button */}
      <div className="relative">
        {mockClub.isAdmin && <ClubEditButton clubId={params.id} />}
        <ClubHeader club={mockClub} />
      </div>

      {/* Interactive actions and notifications (client components) */}
      <ClubInteractiveWrapper
        clubName={mockClub.name}
        clubColor={mockClub.color}
        initialSocialCoins={mockUser.socialCoins}
      />

      {/* Description */}
      <ClubDescription
        description={mockClub.description}
        members={mockClub.members}
        createdAt={mockClub.createdAt}
        color={mockClub.color}
      />

      {/* Invite link */}
      <InviteLinkCard club={mockClub} color={mockClub.color} />

      {/* Tags */}
      <ClubTags tags={mockClub.tags} color={mockClub.color} />

      {/* Highlights */}
      <ClubHighlights highlights={mockClub.highlights} color={mockClub.color} />

      {/* Rewards */}
      <ClubRewards rewards={mockClub.rewards} color={mockClub.color} />

      {/* Stats */}
      <ClubStats
        consultations={mockClub.consultations}
        newMembersThisMonth={mockClub.newMembersThisMonth}
        color={mockClub.color}
      />
    </div>
  )
}
