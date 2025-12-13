import MiembrosSection from "@/components/panel/miembros-section"

export default async function MiembrosPage({ params }: { params: { id: string } }) {
    // TODO: Fetch club members data
    // const members = await getClubMembers(params.id)

    return <MiembrosSection />
}
