import EstructuraSection from "@/components/panel/estructura-section"

// Mock data — replace with real fetch later
const mockClub = {
    id: "1",
    name: "Programación",
    imageUrl: "/placeholder.svg?height=100&width=100",
    description:
        "Comunidad dedicada a compartir conocimientos y recursos sobre programación, desarrollo web y tecnologías emergentes.",
    color: "#f97316",
}

export default async function EstructuraPage({ params }: { params: { id: string } }) {
    // TODO: Fetch real club data
    // const club = await getClubById(params.id)

    return <EstructuraSection club={mockClub} />
}
