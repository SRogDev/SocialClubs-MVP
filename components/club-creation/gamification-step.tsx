"use client"

import { Trophy } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface GamificationData {
    pointsForPost: number
    pointsForReferral: number
}

interface GamificationStepProps {
    gamification: GamificationData
    onGamificationChange: (field: keyof GamificationData, value: number) => void
}

export function GamificationStep({
    gamification,
    onGamificationChange
}: GamificationStepProps) {
    return (
        <div className="space-y-6">
            <div className="text-center">
                <h2 className="text-2xl font-bold mb-2">Gamificación</h2>
                <p className="text-muted-foreground">Configura el sistema de puntos y recompensas</p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Trophy size={24} className="text-amber-500" />
                        Sistema de Recompensas
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <Label htmlFor="pointsForPost">Puntos por Publicación</Label>
                            <Input
                                id="pointsForPost"
                                type="number"
                                min="0"
                                value={gamification.pointsForPost}
                                onChange={(e) => onGamificationChange('pointsForPost', parseInt(e.target.value) || 0)}
                                placeholder="10"
                            />
                            <p className="text-sm text-muted-foreground mt-1">
                                Puntos que gana un miembro al publicar contenido
                            </p>
                        </div>

                        <div>
                            <Label htmlFor="pointsForReferral">Puntos por Referido</Label>
                            <Input
                                id="pointsForReferral"
                                type="number"
                                min="0"
                                value={gamification.pointsForReferral}
                                onChange={(e) => onGamificationChange('pointsForReferral', parseInt(e.target.value) || 0)}
                                placeholder="50"
                            />
                            <p className="text-sm text-muted-foreground mt-1">
                                Puntos que gana un miembro al referir a alguien nuevo
                            </p>
                        </div>
                    </div>

                    <div className="bg-muted/50 p-4 rounded-lg">
                        <h4 className="font-semibold mb-2">Vista Previa</h4>
                        <div className="text-sm text-muted-foreground space-y-1">
                            <p>• Publicar contenido: +{gamification.pointsForPost} puntos</p>
                            <p>• Referir a un amigo: +{gamification.pointsForReferral} puntos</p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}