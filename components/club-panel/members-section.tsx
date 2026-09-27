import { UserPlus } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

/**
 * Members section component - manages club members
 */
export default function MembersSection() {
    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold">Miembros del Club</h1>
                <Button>
                    <UserPlus size={18} className="mr-2" />
                    Invitar miembros
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Gestión de miembros</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">Gestiona los miembros de tu club aquí.</p>
                </CardContent>
            </Card>
        </div>
    )
}
