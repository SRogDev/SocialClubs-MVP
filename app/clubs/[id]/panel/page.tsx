import { redirect } from "next/navigation"

export default async function PanelPage({ params }: { params: { id: string } }) {
    // Redirect to estructura by default
    redirect(`/clubs/${params.id}/panel/estructura`)
}
