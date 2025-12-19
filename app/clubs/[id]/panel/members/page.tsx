import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import MembersSection from "@/components/club-panel/members-section";

export default async function MembersPage({ params }: { params: { id: string } }) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.getClaims();
    if (error || !data?.claims) {
        redirect("/auth/login");
    }
    // TODO: Fetch club members data
    // const members = await getClubMembers(params.id)
    return <MembersSection />;
}
