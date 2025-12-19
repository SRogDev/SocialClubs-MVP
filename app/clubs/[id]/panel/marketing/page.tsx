import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import MarketingSection from "@/components/club-panel/marketing-section";

export default async function MarketingPage({ params }: { params: { id: string } }) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.getClaims();
    if (error || !data?.claims) {
        redirect("/auth/login");
    }
    // TODO: Fetch marketing data
    // const campaigns = await getClubCampaigns(params.id)
    return <MarketingSection />;
}
