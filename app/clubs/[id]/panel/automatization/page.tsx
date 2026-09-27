import { redirect } from "next/navigation";

import AutomationSection from "@/components/club-panel/automation-section";
import { createClient } from "@/lib/supabase/server";

// Mock data — replace with real fetch later
const mockChannels = [
    { id: "1", name: "General" },
    { id: "2", name: "Proyectos" },
    { id: "3", name: "Recursos" },
    { id: "4", name: "Mentoría" },
];

export default async function AutomatizarPage({ params }: { params: { id: string } }) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.getClaims();
    if (error || !data?.claims) {
        redirect("/auth/login");
    }
    // TODO: Fetch club channels data
    // const channels = await getClubChannels(params.id)
    return <AutomationSection channels={mockChannels} />;
}
