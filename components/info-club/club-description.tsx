import { Card, CardContent } from "@/components/ui/card"

type ClubDescriptionProps = {
    description: string
    members: number
    createdAt: string
    color: string
}

export default function ClubDescription({ description, members, createdAt, color }: ClubDescriptionProps) {
    return (
        <GlassCard
            className="shadow-sm hover:shadow-md transition-all duration-300"
            color={color}
            style={{ borderColor: `${color}40` }}
        >
            <CardContent className="pt-6">
                <div className="space-y-4">
                    <div>
                        <h2 className="text-lg font-serif font-semibold mb-3" style={{ color }}>
                            Descripción
                        </h2>
                        <p className="text-muted-foreground leading-relaxed">{description}</p>

                        <div className="flex justify-between mt-4 pt-4 border-t" style={{ borderColor: `${color}20` }}>
                            <div>
                                <h3 className="text-sm font-medium text-muted-foreground">Miembros</h3>
                                <p className="font-serif font-semibold text-lg">{members.toLocaleString()}</p>
                            </div>
                            <div>
                                <h3 className="text-sm font-medium text-muted-foreground">Creado</h3>
                                <p className="font-serif font-semibold text-lg">{createdAt}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
