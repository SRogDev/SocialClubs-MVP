import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AnalyticsSection from "@/components/club-panel/analytics-section";

export default async function AnaliticasPage({ params }: { params: { id: string } }) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.getClaims();
    if (error || !data?.claims) {
        redirect("/auth/login");
    }
    // TODO: Fetch analytics data
    // const analytics = await getClubAnalytics(params.id)
    return <AnalyticsSection />;
}
