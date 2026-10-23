import { redirect } from "next/navigation";

import { AuthorizationError, requireClubRole } from "@/lib/authz";
import { createClient } from "@/lib/supabase/server";
import IntegrationsPanel from "./IntegrationsPanel";

export default async function AIIntegrationsPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id: clubId } = await params;
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) redirect("/login");
    try {
        await requireClubRole(user.id, clubId, ["owner", "admin"]);
    } catch (e) {
        if (e instanceof AuthorizationError) redirect(`/clubs/${clubId}/inicio`);
        throw e;
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Aplicaciones conectadas</h1>
                <p className="text-muted-foreground">
                    Conecta las aplicaciones de tu club para que tu personal IA, tus
                    minijuegos y tus widgets trabajen con ellas. Tú solo autorizas con
                    OAuth: nunca compartes contraseñas ni claves.
                </p>
            </div>
            <IntegrationsPanel clubId={clubId} />
        </div>
    );
}
