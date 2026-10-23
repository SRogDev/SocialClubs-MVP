import { Gamepad2 } from "lucide-react"
import { notFound, redirect } from "next/navigation"

import { gameSummary } from "@/app/api/games/shared"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AI_MINIGAME_RUNTIME, isEnabled } from "@/lib/ai/flags"
import { requireClubRole } from "@/lib/authz"
import { defaultGameService } from "@/lib/games/service"
import { createClient } from "@/lib/supabase/server"
import { listClubEvents } from "@/services/eventService"

import GamesStudio from "./GamesStudio"

/**
 * Minijuegos IA — creator studio (minigame runtime).
 * Staff only (owner/admin). Gated by AI_MINIGAME_RUNTIME (default OFF):
 * when the flag is off the page renders a "función no activada" notice
 * instead of the studio, following the AI panel pages' Spanish-first style.
 */
export default async function AIGamesPage({
    params,
}: {
    params: Promise<{ id: string }>
}) {
    const { id: clubId } = await params

    if (!isEnabled(AI_MINIGAME_RUNTIME)) {
        return (
            <div className="mx-auto max-w-3xl space-y-8 p-6">
                <Card>
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <Gamepad2 size={22} className="text-[#7C3AED]" aria-hidden />
                            <CardTitle>Minijuegos IA</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground">
                            Esta función no está activada en este servidor. Cuando se active,
                            aquí podrás crear minijuegos con IA para tu club, revisarlos y
                            publicarlos para tus miembros.
                        </p>
                    </CardContent>
                </Card>
            </div>
        )
    }

    const supabase = await createClient()
    const {
        data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
        redirect("/auth/login")
    }
    try {
        await requireClubRole(user.id, clubId, ["owner", "admin"])
    } catch {
        notFound()
    }

    // Initial library + event options are best-effort: the studio stays
    // usable (and can refetch via the API) even if a read fails.
    let initialGames: ReturnType<typeof gameSummary>[] = []
    try {
        const rows = await defaultGameService().listLibrary(clubId)
        initialGames = rows.map(gameSummary)
    } catch {
        initialGames = []
    }

    let events: { id: string; title: string }[] = []
    try {
        const rows = await listClubEvents(clubId)
        events = rows.map((e) => ({ id: e.id, title: e.title }))
    } catch {
        events = []
    }

    return <GamesStudio clubId={clubId} initialGames={initialGames} events={events} />
}
