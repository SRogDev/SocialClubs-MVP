"use client"

import { usePathname } from "next/navigation"
import ClubPanelSidebar from "./club-panel-sidebar"

type ClubPanelSidebarWrapperProps = {
    clubId: string
    clubName: string
}

export default function ClubPanelSidebarWrapper({ clubId, clubName }: ClubPanelSidebarWrapperProps) {
    const pathname = usePathname()

    // Extract active section from URL
    const segments = pathname.split("/")
    const activeSection = segments[segments.length - 1] || "general"

    return <ClubPanelSidebar clubId={clubId} clubName={clubName} activeSection={activeSection} />
}
