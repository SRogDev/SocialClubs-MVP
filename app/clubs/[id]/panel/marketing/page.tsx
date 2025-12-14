import MarketingSection from "@/components/club-panel/marketing-section"

export default async function MarketingPage({ params }: { params: { id: string } }) {
    // TODO: Fetch marketing data
    // const campaigns = await getClubCampaigns(params.id)

    return <MarketingSection />
}
