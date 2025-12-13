import AutomatizarSection from "@/components/panel/automatizar-section"

// Mock data — replace with real fetch later
const mockChannels = [
    { id: "1", name: "General" },
    { id: "2", name: "Proyectos" },
    { id: "3", name: "Recursos" },
    { id: "4", name: "Mentoría" },
]

export default async function AutomatizarPage({ params }: { params: { id: string } }) {
    // TODO: Fetch club channels data
    // const channels = await getClubChannels(params.id)

    return <AutomatizarSection channels={mockChannels} />
}
