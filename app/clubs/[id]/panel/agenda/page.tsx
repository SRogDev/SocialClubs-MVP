import { redirect } from "next/navigation";

import AgendaSection from "@/components/club-panel/agenda-section";
import { createClient } from "@/lib/supabase/server";

export default async function AgendaPage({ params }: { params: { id: string } }) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.getClaims();
    if (error || !data?.claims) {
        redirect("/auth/login");
    }

    // Verify user is the club creator
    const { data: club } = await supabase
        .from('clubs')
        .select('creator')
        .eq('id', params.id)
        .single();

    if (!club || club.creator !== data.claims.sub) {
        redirect(`/clubs/${params.id}`);
    }

    return <AgendaSection clubId={params.id} />;
}
