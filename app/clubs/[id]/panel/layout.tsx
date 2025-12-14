import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import ClubPanelSidebarWrapper from "@/components/club-panel/club-panel-sidebar-wrapper"

// Mock data — replace with real fetch later
const mockClub = {
    id: "1",
    name: "Programación",
}

export default async function PanelLayout({
    children,
    params,
}: {
    children: React.ReactNode
    params: { id: string }
}) {
    // TODO: Fetch real club data
    // const club = await getClubById(params.id)

    return (
        <div className="flex min-h-screen flex-col">
            {/* Top bar */}
            <div className="container border-b py-4">
                <Link
                    href={`/clubs/${params.id}/info`}
                    className="group flex items-center text-muted-foreground hover:text-foreground"
                >
                    <ArrowLeft size={18} className="mr-1 transition-transform group-hover:-translate-x-1" />
                    <span>Volver a información del club</span>
                </Link>
            </div>

            {/* Body */}
            <div className="flex flex-1 overflow-hidden">
                {/* Desktop sidebar */}
                <div className="hidden h-full w-64 md:block">
                    <ClubPanelSidebarWrapper clubId={params.id} clubName={mockClub.name} />
                </div>

                {/* Main area */}
                <div className="flex-1 overflow-auto">{children}</div>
            </div>
        </div>
    )
}
