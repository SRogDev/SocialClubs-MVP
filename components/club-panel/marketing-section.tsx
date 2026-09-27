import { Megaphone } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

/**
 * Marketing section component - manages club marketing and promotion
 */
export default function MarketingSection() {
    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center gap-2">
                <Megaphone size={28} className="text-blue-500" />
                <h1 className="text-2xl font-bold">Marketing</h1>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Promoción del club</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <p className="text-muted-foreground">Gestiona campañas y estrategias de marketing para tu club.</p>
                    <Button className="w-full">Crear campaña</Button>
                </CardContent>
            </Card>
        </div>
    )
}
