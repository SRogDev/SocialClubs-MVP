import { redirect } from "next/navigation";

import GeneralSection from "@/components/club-panel/general-section";
import { createClient } from "@/lib/supabase/server";

// Mock data — replace with real fetch later
const mockClub = {
    id: "1",
    name: "Programación",
    imageUrl: "/placeholder.svg?height=100&width=100",
    description:
        "Comunidad dedicada a compartir conocimientos y recursos sobre programación, desarrollo web y tecnologías emergentes.",
    color: "#f97316",
};

export default async function GeneralPage({ params }: { params: { id: string } }) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.getClaims();
    if (error || !data?.claims) {
        redirect("/auth/login");
    }
    // TODO: Fetch real club data
    // const club = await getClubById(params.id)
    return <GeneralSection club={mockClub} />;
}
