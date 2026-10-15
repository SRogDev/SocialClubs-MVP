"use client"

/**
 * CopilotPanel — Creator Copilot UI (master plan Phases 39-40).
 *
 * The creator's AI assistant panel, Spanish-first. Two tools:
 *   1. Generar borrador: topic input (+ tone) → draft card with
 *      Usar borrador / Mejorar / Descartar.
 *   2. Mejorar texto: rewrite the creator's existing text, showing the
 *      improved version and the list of changes.
 *
 * DRAFTS ONLY — "Usar borrador" hands the draft to the caller via
 * `onUseDraft` (the post editor); this panel never publishes anything.
 */
import { useState } from "react"
import { Sparkles, Wand2, X, Check } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Spinner } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"

interface PostDraft {
    title: string
    body: string
    tags: string[]
}

interface CopilotPanelProps {
    clubId: string
    /** Accent color from the club theme. */
    clubColor?: string
    /** Called with the draft text when the creator chooses "Usar borrador". */
    onUseDraft?: (text: string) => void
}

type Tone = "friendly" | "professional" | "fun" | "inspiring"

const TONE_LABELS: Record<Tone, string> = {
    friendly: "Amable",
    professional: "Profesional",
    fun: "Divertido",
    inspiring: "Inspirador",
}

async function postJson<T>(url: string, body: Record<string, unknown>): Promise<T> {
    const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    })
    const json = (await res.json()) as { data?: T; message?: string; code?: string }
    if (!res.ok) {
        const err = new Error(json.message ?? "Error de IA") as Error & { code?: string }
        err.code = json.code
        throw err
    }
    return json.data as T
}

export default function CopilotPanel({ clubId, clubColor = "#f97316", onUseDraft }: CopilotPanelProps) {
    const [topic, setTopic] = useState("")
    const [tone, setTone] = useState<Tone>("friendly")
    const [draft, setDraft] = useState<PostDraft | null>(null)
    const [loadingDraft, setLoadingDraft] = useState(false)
    const [draftError, setDraftError] = useState<string | null>(null)

    const [text, setText] = useState("")
    const [improved, setImproved] = useState<{ improved: string; changes: string[] } | null>(null)
    const [loadingImprove, setLoadingImprove] = useState(false)
    const [improveError, setImproveError] = useState<string | null>(null)

    async function handleGenerate() {
        if (!topic.trim()) return
        setLoadingDraft(true)
        setDraftError(null)
        try {
            const data = await postJson<{ draft: PostDraft }>("/api/ai/copilot/draft-post", {
                clubId,
                topic: topic.trim(),
                tone,
            })
            setDraft(data.draft)
        } catch (err) {
            setDraftError(err instanceof Error ? err.message : "No se pudo generar el borrador")
        } finally {
            setLoadingDraft(false)
        }
    }

    async function handleImprove() {
        if (!text.trim()) return
        setLoadingImprove(true)
        setImproveError(null)
        try {
            const data = await postJson<{ improved: string; changes: string[] }>(
                "/api/ai/copilot/improve",
                { clubId, content: text.trim() },
            )
            setImproved(data)
        } catch (err) {
            setImproveError(err instanceof Error ? err.message : "No se pudo mejorar el texto")
        } finally {
            setLoadingImprove(false)
        }
    }

    function useDraft() {
        if (!draft) return
        onUseDraft?.(`${draft.title}\n\n${draft.body}`)
    }

    return (
        <div className="space-y-4">
            {/* Draft generator */}
            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-base">
                        <Sparkles size={18} style={{ color: clubColor }} aria-hidden />
                        Generar borrador
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    <div className="flex flex-col sm:flex-row gap-2">
                        <Input
                            value={topic}
                            onChange={(e) => setTopic(e.target.value)}
                            placeholder="¿Sobre qué quieres escribir? Ej.: torneo de dominó del sábado"
                            aria-label="Tema del borrador"
                        />
                        <Select value={tone} onValueChange={(v) => setTone(v as Tone)}>
                            <SelectTrigger className="w-full sm:w-40" aria-label="Tono">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {(Object.keys(TONE_LABELS) as Tone[]).map((t) => (
                                    <SelectItem key={t} value={t}>
                                        {TONE_LABELS[t]}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <Button
                        onClick={handleGenerate}
                        disabled={loadingDraft || !topic.trim()}
                        className="w-full cursor-pointer"
                        style={{ backgroundColor: clubColor }}
                    >
                        {loadingDraft ? <Spinner className="text-white" /> : <Sparkles size={16} aria-hidden />}
                        {loadingDraft ? "Generando…" : "Generar borrador"}
                    </Button>
                    {draftError && (
                        <p role="alert" className="text-sm text-red-600">{draftError}</p>
                    )}

                    {draft && (
                        <div className="rounded-lg border p-4 space-y-2" aria-live="polite">
                            <h3 className="font-semibold">{draft.title}</h3>
                            <p className="text-sm whitespace-pre-wrap">{draft.body}</p>
                            {draft.tags.length > 0 && (
                                <div className="flex flex-wrap gap-1">
                                    {draft.tags.map((tag) => (
                                        <Badge key={tag} variant="secondary">#{tag}</Badge>
                                    ))}
                                </div>
                            )}
                            <div className="flex flex-wrap gap-2 pt-2">
                                <Button size="sm" onClick={useDraft} className="cursor-pointer">
                                    <Check size={14} aria-hidden /> Usar borrador
                                </Button>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="cursor-pointer"
                                    onClick={() => { setText(draft.body); setImproved(null) }}
                                >
                                    <Wand2 size={14} aria-hidden /> Mejorar
                                </Button>
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    className="cursor-pointer"
                                    onClick={() => setDraft(null)}
                                >
                                    <X size={14} aria-hidden /> Descartar
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Improve existing text */}
            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-base">
                        <Wand2 size={18} style={{ color: clubColor }} aria-hidden />
                        Mejorar texto
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    <Textarea
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        placeholder="Pega o escribe tu texto aquí…"
                        rows={4}
                        aria-label="Texto a mejorar"
                    />
                    <Button
                        onClick={handleImprove}
                        disabled={loadingImprove || !text.trim()}
                        variant="outline"
                        className="w-full cursor-pointer"
                    >
                        {loadingImprove ? <Spinner /> : <Wand2 size={16} aria-hidden />}
                        {loadingImprove ? "Mejorando…" : "Mejorar"}
                    </Button>
                    {improveError && (
                        <p role="alert" className="text-sm text-red-600">{improveError}</p>
                    )}

                    {improved && (
                        <div className="rounded-lg border p-4 space-y-2" aria-live="polite">
                            <p className="text-sm whitespace-pre-wrap">{improved.improved}</p>
                            {improved.changes.length > 0 && (
                                <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-1">
                                    {improved.changes.map((change, i) => (
                                        <li key={i}>{change}</li>
                                    ))}
                                </ul>
                            )}
                            <div className="flex gap-2 pt-2">
                                <Button
                                    size="sm"
                                    className="cursor-pointer"
                                    onClick={() => { setText(improved.improved); setImproved(null) }}
                                >
                                    <Check size={14} aria-hidden /> Usar esta versión
                                </Button>
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    className="cursor-pointer"
                                    onClick={() => setImproved(null)}
                                >
                                    <X size={14} aria-hidden /> Descartar
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
