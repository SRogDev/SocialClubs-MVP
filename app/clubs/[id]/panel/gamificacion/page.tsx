import GamificacionSection from "@/components/panel/gamificacion-section"

export default async function GamificacionPage({ params }: { params: { id: string } }) {
    // TODO: Fetch gamification settings
    // const gamificationData = await getClubGamification(params.id)

    return <GamificacionSection />
}
