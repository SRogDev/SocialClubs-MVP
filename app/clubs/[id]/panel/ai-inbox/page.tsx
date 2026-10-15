import { notFound, redirect } from "next/navigation"

import AiInboxSection from "@/components/club-panel/ai-inbox-section"
import { AI_INBOX, isEnabled } from "@/lib/ai/flags"
import { requireClubRole } from "@/lib/authz"
import { createClient } from "@/lib/supabase/server"

/**
 * AI Inbox page — the creator's trust center for the AI staff.
 * Only club owner/admin/moderator can see it (enforced here and in the API).
 * Gated by the AI_INBOX env flag (default OFF).
 */
export default async function AiInboxPage({
    params,
}: {
    params: Promise<{ id: string }>
}) {
    if (!isEnabled(AI_INBOX)) {
        notFound()
    }
    const { id } = await params

    const supabase = await createClient()
    const {
        data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
        redirect("/auth/login")
    }
    try {
        await requireClubRole(user.id, id, ["owner", "admin", "moderator"])
    } catch {
        notFound()
    }

    return <AiInboxSection clubId={id} />
}
