import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

type Channel = {
    id: string
    name: string
}

type AutomatizarSectionProps = {
    channels: Channel[]
}

/**
 * Automatizar section component - manages automation rules
 */
export default function AutomatizarSection({ channels }: AutomatizarSectionProps) {
    return (
        <div className="p-6 space-y-6">
            <h1 className="text-2xl font-bold">Automatización</h1>

            <Card>
                <CardHeader>
                    <CardTitle>Reglas de automatización</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">Configura reglas automáticas para tus canales.</p>
                    <div className="mt-4">
                        <p className="text-sm font-medium mb-2">Canales disponibles:</p>
                        <ul className="space-y-1">
                            {channels.map((channel) => (
                                <li key={channel.id} className="text-sm text-muted-foreground">
                                    #{channel.name}
                                </li>
                            ))}
                        </ul>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
