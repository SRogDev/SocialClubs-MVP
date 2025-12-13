import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CalendarPlus } from "lucide-react"

/**
 * Agenda section component - manages club events and calendar
 */
export default function AgendaSection() {
    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold">Agenda</h1>
                <Button>
                    <CalendarPlus size={18} className="mr-2" />
                    Nuevo evento
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Calendario de eventos</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">Gestiona los eventos de tu club aquí.</p>
                </CardContent>
            </Card>
        </div>
    )
}
