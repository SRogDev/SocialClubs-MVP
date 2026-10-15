"use client"

import { useEffect, useState } from "react"
import { usePathname } from "next/navigation"

import ClubPanelSidebar from "./club-panel-sidebar"

type ClubPanelSidebarWrapperProps = {
    clubId: string
    clubName: string
}

/**
 * Client wrapper: resolves the active section from the URL and loads the
 * AI Inbox pending count for the "Bandeja IA" badge. A failed fetch
 * (unauthenticated, flag off, network) silently leaves the badge hidden.
 */
export default function ClubPanelSidebarWrapper({ clubId, clubName }: ClubPanelSidebarWrapperProps) {
    const pathname = usePathname()
    const [pendingCount, setPendingCount] = useState(0)

    // Extract active section from URL
    const segments = pathname.split("/")
    const activeSection = segments[segments.length - 1] || "general"

    useEffect(() => {
        let cancelled = false
        const qs = new URLSearchParams({
            clubId,
            status: "pending_approval,draft",
            countOnly: "1",
        })
        fetch(`/api/ai/inbox?${qs.toString()}`)
            .then((res) => (res.ok ? res.json() : null))
            .then((body) => {
                if (!cancelled && body?.data && typeof body.data.count === "number") {
                    setPendingCount(body.data.count)
                }
            })
            .catch(() => {
                // Badge stays hidden — never break navigation for a count.
            })
        return () => {
            cancelled = true
        }
    }, [clubId])

    return <ClubPanelSidebar clubId={clubId} clubName={clubName} activeSection={activeSection} pendingCount={pendingCount} />
}
