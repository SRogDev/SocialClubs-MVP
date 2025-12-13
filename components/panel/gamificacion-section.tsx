import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Trophy } from "lucide-react"

/**
 * Gamificacion section component - manages gamification settings
 */
export default function GamificacionSection() {
    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center gap-2">
                <Trophy size={28} className="text-amber-500" />
                <h1 className="text-2xl font-bold">Gamificación</h1>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Sistema de recompensas</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">
                        Configura logros, puntos y recompensas para incentivar la participación.
                    </p>
                </CardContent>
            </Card>
        </div>
    )
}
