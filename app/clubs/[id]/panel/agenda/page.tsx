import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AgendaSection from "@/components/club-panel/agenda-section";

export default async function AgendaPage({ params }: { params: { id: string } }) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.getClaims();
    if (error || !data?.claims) {
        redirect("/auth/login");
    }
    // TODO: Fetch club events data
    // const events = await getClubEvents(params.id)
    return <AgendaSection />;
}
