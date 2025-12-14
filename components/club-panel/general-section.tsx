import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import DeleteClubButton from "@/components/club-panel/delete-club-button"

type Club = {
    id: string
    name: string
    imageUrl: string
    description: string
    color: string
}

type GeneralSectionProps = {
    club: Club
}

/**
 * General section component - manages club basic info and dangerous actions
 */
export default function GeneralSection({ club }: GeneralSectionProps) {
    return (
        <div className="p-6 space-y-6">
            <h1 className="text-2xl font-bold">General</h1>

            <Card>
                <CardHeader>
                    <CardTitle>Información básica</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex justify-center mb-4">
                        <Avatar className="h-24 w-24 ring-4" style={{ ['--tw-ring-color' as any]: `${club.color}40` }}>
                            <AvatarImage src={club.imageUrl} alt={club.name} />
                            <AvatarFallback style={{ backgroundColor: `${club.color}20`, color: club.color }}>
                                {club.name.substring(0, 2).toUpperCase()}
                            </AvatarFallback>
                        </Avatar>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="name">Nombre del club</Label>
                        <Input id="name" defaultValue={club.name} />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="description">Descripción</Label>
                        <Textarea id="description" defaultValue={club.description} rows={4} />
                    </div>

                    <Button className="w-full">Guardar cambios</Button>
                </CardContent>
            </Card>

            <Card className="border-destructive">
                <CardHeader>
                    <CardTitle className="text-destructive">Zona peligrosa</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                        Eliminar este club es una acción permanente que no se puede deshacer.
                        Todos los datos, posts, y miembros serán eliminados.
                    </p>
                    <DeleteClubButton clubId={club.id} clubName={club.name} />
                </CardContent>
            </Card>
        </div>
    )
}
