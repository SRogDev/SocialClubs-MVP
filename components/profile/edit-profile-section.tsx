"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Edit } from "lucide-react"
import EditProfileModal from "@/components/profile/edit-profile-modal"

interface EditProfileSectionProps {
    userId: string
}

export default function EditProfileSection({ userId }: EditProfileSectionProps) {
    const [isEditModalOpen, setIsEditModalOpen] = useState(false)

    return (
        <>
            <Button
                variant="outline"
                className="flex-1 gap-2"
                onClick={() => setIsEditModalOpen(true)}
            >
                <Edit className="h-4 w-4" />
                Editar perfil
            </Button>

            <EditProfileModal
                open={isEditModalOpen}
                onOpenChange={setIsEditModalOpen}
            />
        </>
    )
}
