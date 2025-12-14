import MembersSection from "@/components/club-panel/members-section"

export default async function MembersPage({ params }: { params: { id: string } }) {
    // TODO: Fetch club members data
    // const members = await getClubMembers(params.id)

    return <MembersSection />
}
