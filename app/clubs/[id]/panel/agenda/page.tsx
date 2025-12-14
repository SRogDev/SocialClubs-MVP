import AgendaSection from "@/components/club-panel/agenda-section"

export default async function AgendaPage({ params }: { params: { id: string } }) {
    // TODO: Fetch club events data
    // const events = await getClubEvents(params.id)

    return <AgendaSection />
}
