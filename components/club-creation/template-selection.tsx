"use client"

import { Plus } from "lucide-react"

import clubTemplates from "@/club-templates.json"
import { Card, CardContent } from "@/components/ui/card"

interface Template {
    id: string
    name: string
    description: string
    color: string
    isPrivate: boolean
    welcomeMessage: string
    channels: any[]
    gamification: any
    agent: any
}

interface TemplateSelectionProps {
    onTemplateSelect: (template: Template | null) => void
}

export function TemplateSelection({ onTemplateSelect }: TemplateSelectionProps) {
    return (
        <div className="space-y-8">
            <div className="text-center">
                <h2 className="text-3xl font-bold mb-4">Elige una Plantilla</h2>
                <p className="text-muted-foreground">Selecciona una plantilla para comenzar rápidamente o crea tu club personalizado</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
                <Card
                    className="cursor-pointer hover:shadow-lg transition-shadow border-2 hover:border-primary"
                    onClick={() => onTemplateSelect(null)}
                >
                    <CardContent className="p-6 text-center">
                        <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                            <Plus size={32} className="text-muted-foreground" />
                        </div>
                        <h3 className="text-xl font-semibold mb-2">Custom</h3>
                        <p className="text-sm text-muted-foreground">Crea tu club desde cero con configuración personalizada</p>
                    </CardContent>
                </Card>

                {clubTemplates.map((template) => (
                    <Card
                        key={template.id}
                        className="cursor-pointer hover:shadow-lg transition-shadow border-2 hover:border-primary"
                        onClick={() => onTemplateSelect(template)}
                    >
                        <CardContent className="p-6 text-center">
                            <div
                                className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-white text-2xl"
                                style={{ backgroundColor: template.color }}
                            >
                                {template.name.charAt(0)}
                            </div>
                            <h3 className="text-xl font-semibold mb-2">{template.name}</h3>
                            <p className="text-sm text-muted-foreground mb-4">{template.description}</p>
                            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                                {template.isPrivate ? (
                                    <>
                                        <span>🔒 Privado</span>
                                    </>
                                ) : (
                                    <>
                                        <span>🌍 Público</span>
                                    </>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    )
}