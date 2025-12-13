import AnaliticasSection from "@/components/panel/analiticas-section"

export default async function AnaliticasPage({ params }: { params: { id: string } }) {
    // TODO: Fetch analytics data
    // const analytics = await getClubAnalytics(params.id)

    return <AnaliticasSection />
}
