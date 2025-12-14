import AnalyticsSection from "@/components/club-panel/analytics-section"

export default async function AnaliticasPage({ params }: { params: { id: string } }) {
    // TODO: Fetch analytics data
    // const analytics = await getClubAnalytics(params.id)

    return <AnalyticsSection />
}
