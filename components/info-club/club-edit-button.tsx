import { Button } from "@/components/ui/button"
import { Edit } from "lucide-react"
import Link from "next/link"

type ClubEditButtonProps = {
    clubId: string
}

export default function ClubEditButton({ clubId }: ClubEditButtonProps) {
    return (
        <Link href={`/clubs/${clubId}/panel/general`}>
            <Button
                variant="ghost"
                size="icon"
                className="absolute top-0 right-0 transition-transform hover:scale-110 hover:bg-amber-50 dark:hover:bg-amber-900/20"
            >
                <Edit size={20} className="text-amber-600 dark:text-amber-400" />
                <span className="sr-only">Editar club</span>
            </Button>
        </Link>
    )
}
