"use client"

import { Bot } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"

interface AgentData {
    personality: {
        role: string
        tone: string
        temperature: number
    }
    context: {
        baseKnowledge?: string
        boundaryRules: string[]
    }
    skills: {
        name: string
        action: string
        accessSubscriptionId?: string
    }[]
}

interface AgentStepProps {
    agent: AgentData
    onAgentChange: (agent: AgentData) => void
}

export function AgentStep({ agent, onAgentChange }: AgentStepProps) {
    const handlePersonalityChange = (field: keyof AgentData['personality'], value: string | number) => {
        onAgentChange({
            ...agent,
            personality: {
                ...agent.personality,
                [field]: value
            }
        })
    }

    const handleContextChange = (field: keyof AgentData['context'], value: string | string[]) => {
        onAgentChange({
            ...agent,
            context: {
                ...agent.context,
                [field]: value
            }
        })
    }

    return (
        <div className="space-y-6">
            <div className="text-center">
                <h2 className="text-2xl font-bold mb-2">Asistente IA</h2>
                <p className="text-muted-foreground">Configura el agente inteligente de tu club</p>
            </div>

            <div className="bg-muted/50 p-4 rounded-lg mb-6">
                <div className="flex items-center gap-2 mb-2">
                    <Bot size={20} className="text-primary" />
                    <h3 className="font-semibold">Asistente Virtual</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                    El asistente IA ayudará a moderar el club, responder preguntas y facilitar la interacción entre miembros.
                </p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Personalidad del Agente</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div>
                        <Label htmlFor="agentRole">Rol del Agente</Label>
                        <Input
                            id="agentRole"
                            value={agent.personality.role}
                            onChange={(e) => handlePersonalityChange('role', e.target.value)}
                            placeholder="Ej: Tutor educativo, Moderador de comunidad"
                        />
                    </div>

                    <div>
                        <Label htmlFor="agentTone">Tono</Label>
                        <Select
                            value={agent.personality.tone}
                            onValueChange={(value) => handlePersonalityChange('tone', value)}
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="didactico">Didáctico</SelectItem>
                                <SelectItem value="entusiasta">Entusiasta</SelectItem>
                                <SelectItem value="reflexivo">Reflexivo</SelectItem>
                                <SelectItem value="alegre">Alegre</SelectItem>
                                <SelectItem value="profesional">Profesional</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Contexto y Conocimiento</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div>
                        <Label htmlFor="baseKnowledge">Conocimiento Base</Label>
                        <Textarea
                            id="baseKnowledge"
                            value={agent.context.baseKnowledge || ''}
                            onChange={(e) => handleContextChange('baseKnowledge', e.target.value)}
                            placeholder="Describe el conocimiento específico del dominio de tu club"
                            rows={4}
                        />
                    </div>
                </CardContent>
            </Card>

            <div className="text-sm text-muted-foreground">
                <p><strong>Nota:</strong> La configuración completa del agente estará disponible en el panel de administración después de crear el club.</p>
            </div>
        </div>
    )
}