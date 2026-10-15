import { Bot, Check } from "lucide-react"
import { notFound, redirect } from "next/navigation"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { AI_STAFF_ENABLED, isEnabled } from "@/lib/ai/flags"
import { createClient } from "@/lib/supabase/server"

import { getAIConfig, saveAIConfig } from "./actions"
import { AGENT_LABELS, CONFIGURABLE_AGENTS, LEVELS, TONES } from "./config"

/**
 * AI config page — the creator control center (Phases 41-45).
 * The club owner/admin chooses the proactivity level (1/2/3), toggles staff
 * agents, and sets the tone. Spanish-first.
 * Gated by AI_STAFF_ENABLED (default OFF) like the rest of the AI staff.
 */

export default async function AIConfigPage({
    params,
}: {
    params: Promise<{ id: string }>
}) {
    if (!isEnabled(AI_STAFF_ENABLED)) {
        notFound()
    }
    const { id: clubId } = await params

    const supabase = await createClient()
    const {
        data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
        redirect("/auth/login")
    }

    let config
    try {
        config = await getAIConfig(clubId)
    } catch {
        // requireConfigAccess throws for non owner/admin — hide the page
        notFound()
    }

    async function save(formData: FormData): Promise<void> {
        "use server"
        const res = await saveAIConfig(clubId, formData)
        if (!res.success) {
            console.error("[ai-config] save failed:", res.error)
        }
    }

    return (
        <div className="mx-auto max-w-3xl space-y-8 p-6">
            <div>
                <div className="flex items-center gap-2">
                    <Bot size={22} className="text-[#7C3AED]" />
                    <h1 className="text-2xl font-bold">Configuración de IA</h1>
                    <Badge variant="secondary">Nivel actual: {config.proactivityLevel}</Badge>
                </div>
                <p className="mt-2 text-muted-foreground">
                    Tú decides cuánta autonomía le das a la IA de tu club.{" "}
                    <strong>El Nivel 1 es el valor por defecto:</strong> la IA solo prepara
                    borradores y nada se ejecuta sin tu aprobación en la Bandeja IA.
                    Los niveles 2 y 3 solo se activan si tú los eliges aquí.
                </p>
            </div>

            <form action={save} className="space-y-8">
                <section className="space-y-4">
                    <h2 className="text-lg font-semibold">Nivel de proactividad</h2>
                    <div className="grid gap-4">
                        {LEVELS.map((entry) => {
                            const selected = config.proactivityLevel === entry.level
                            return (
                                <label key={entry.level} className="cursor-pointer">
                                    <input
                                        type="radio"
                                        name="proactivity_level"
                                        value={entry.level}
                                        defaultChecked={selected}
                                        className="peer sr-only"
                                    />
                                    <Card
                                        className={`transition-all peer-checked:border-[#7C3AED] peer-checked:ring-2 peer-checked:ring-[#7C3AED]/30 hover:border-[#7C3AED]/50 ${
                                            selected ? "border-[#7C3AED] ring-2 ring-[#7C3AED]/30" : ""
                                        }`}
                                    >
                                        <CardHeader>
                                            <div className="flex items-center justify-between">
                                                <CardTitle className="text-base">{entry.title}</CardTitle>
                                                {selected && (
                                                    <Badge className="bg-[#7C3AED]">
                                                        <Check size={12} className="mr-1" /> Actual
                                                    </Badge>
                                                )}
                                            </div>
                                            <CardDescription>{entry.tagline}</CardDescription>
                                        </CardHeader>
                                        <CardContent className="space-y-2 text-sm">
                                            <p className="text-muted-foreground">{entry.description}</p>
                                            <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
                                                {entry.capabilities.map((c) => (
                                                    <li key={c}>{c}</li>
                                                ))}
                                            </ul>
                                        </CardContent>
                                    </Card>
                                </label>
                            )
                        })}
                    </div>
                </section>

                <section className="space-y-4">
                    <h2 className="text-lg font-semibold">Agentes activos</h2>
                    <p className="text-sm text-muted-foreground">
                        Activa o pausa cada miembro del personal de IA de tu club.
                    </p>
                    <div className="grid gap-3">
                        {CONFIGURABLE_AGENTS.map((agentId) => {
                            const meta = AGENT_LABELS[agentId] ?? { name: agentId, description: "" }
                            const enabled = config.enabledAgents.includes(agentId)
                            return (
                                <Card key={agentId}>
                                    <CardContent className="flex items-center gap-4 p-4">
                                        <Checkbox
                                            id={`agent_${agentId}`}
                                            name={`agent_${agentId}`}
                                            defaultChecked={enabled}
                                        />
                                        <div className="flex-1">
                                            <Label htmlFor={`agent_${agentId}`} className="cursor-pointer font-medium">
                                                {meta.name}
                                            </Label>
                                            <p className="text-sm text-muted-foreground">{meta.description}</p>
                                        </div>
                                        <Badge variant={enabled ? "default" : "secondary"}>
                                            {enabled ? "Activo" : "Pausado"}
                                        </Badge>
                                    </CardContent>
                                </Card>
                            )
                        })}
                    </div>
                </section>

                <section className="space-y-4">
                    <h2 className="text-lg font-semibold">Tono de la IA</h2>
                    <div className="flex gap-4">
                        {TONES.map((tone) => (
                            <label key={tone.value} className="flex cursor-pointer items-center gap-2">
                                <input
                                    type="radio"
                                    name="tone"
                                    value={tone.value}
                                    defaultChecked={config.tone === tone.value}
                                    className="accent-[#7C3AED]"
                                />
                                <span className="text-sm">{tone.label}</span>
                            </label>
                        ))}
                    </div>
                </section>

                <div className="flex items-center gap-3">
                    <Button type="submit" className="bg-[#7C3AED] hover:bg-[#6D28D9]">
                        Guardar configuración
                    </Button>
                    <p className="text-sm text-muted-foreground">
                        Los cambios aplican a los próximos flujos automáticos.
                    </p>
                </div>
            </form>
        </div>
    )
}
