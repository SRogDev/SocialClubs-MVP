import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import GamificationSection from "@/components/club-panel/gamification-section";

export default async function GamificacionPage({ params }: { params: { id: string } }) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.getClaims();
    if (error || !data?.claims) {
        redirect("/auth/login");
    }
    // TODO: Fetch gamification settings
    // const gamificationData = await getClubGamification(params.id)
    return <GamificationSection />;
}
