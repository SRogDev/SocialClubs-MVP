import GamificationSection from "@/components/club-panel/gamification-section"

export default async function GamificacionPage({ params }: { params: { id: string } }) {
    // TODO: Fetch gamification settings
    // const gamificationData = await getClubGamification(params.id)

    return <GamificationSection />
}
