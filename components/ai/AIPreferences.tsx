"use client"

/**
 * AIPreferences — member control over AI (master plan Phases 73-76).
 *
 * Spanish-first settings card with two toggles:
 * - "Personalización": the AI staff builds a member profile and writes
 *   personalized content for them. OFF = no profile, general drafts only.
 * - "Mensajes proactivos": the AI staff may proactively message/notify the
 *   member (welcome, check-ins, digests). OFF = workflows skip all sends.
 *
 * Both default ON (opt-in model) — the member explicitly toggles them off.
 */
import { useEffect, useState } from "react"
import { BellRing, ShieldCheck, Sparkles } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Spinner } from "@/components/ui/spinner"
import { Switch } from "@/components/ui/switch"

interface AIPreferencesProps {
    clubId: string
    /** Shown in the card intro when the member belongs to several clubs. */
    clubName?: string
}

interface PrefsState {
    allowPersonalization: boolean
    allowProactiveMessages: boolean
}

type Status = "loading" | "ready" | "saving" | "error"

export default function AIPreferences({ clubId, clubName }: AIPreferencesProps) {
    const [prefs, setPrefs] = useState<PrefsState | null>(null)
    const [status, setStatus] = useState<Status>("loading")
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        let cancelled = false
        async function load() {
            try {
                const res = await fetch(`/api/ai/preferences?clubId=${clubId}`)
                if (!res.ok) throw new Error(`HTTP ${res.status}`)
                const { data } = await res.json()
                if (!cancelled) {
                    setPrefs({
                        allowPersonalization: data.allowPersonalization !== false,
                        allowProactiveMessages: data.allowProactiveMessages !== false,
                    })
                    setStatus("ready")
                }
            } catch {
                if (!cancelled) {
                    setStatus("error")
                    setError("No pudimos cargar tus preferencias de IA.")
                }
            }
        }
        load()
        return () => {
            cancelled = true
        }
    }, [clubId])

    async function toggle(key: keyof PrefsState, value: boolean) {
        if (!prefs) return
        const previous = prefs
        setPrefs({ ...prefs, [key]: value })
        setStatus("saving")
        setError(null)
        try {
            const res = await fetch("/api/ai/preferences", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ clubId, [key]: value }),
            })
            if (!res.ok) throw new Error(`HTTP ${res.status}`)
            const { data } = await res.json()
            setPrefs({
                allowPersonalization: data.allowPersonalization !== false,
                allowProactiveMessages: data.allowProactiveMessages !== false,
            })
            setStatus("ready")
        } catch {
            setPrefs(previous)
            setStatus("error")
            setError("No pudimos guardar tu preferencia. Inténtalo de nuevo.")
        }
    }

    const rows: Array<{
        key: keyof PrefsState
        icon: typeof Sparkles
        title: string
        description: string
    }> = [
        {
            key: "allowPersonalization",
            icon: Sparkles,
            title: "Personalización",
            description:
                "La IA del club usa tu actividad (posts, reacciones) para escribirte mensajes a tu medida. Si lo desactivas, no crea tu perfil y todo lo que genere para ti será genérico.",
        },
        {
            key: "allowProactiveMessages",
            icon: BellRing,
            title: "Mensajes proactivos",
            description:
                "La IA del club puede escribirte por su cuenta: bienvenidas, recordatorios o resúmenes. Si lo desactivas, solo recibirás avisos cuando tú interactúes.",
        },
    ]

    return (
        <Card className="border-[#EFE7FC] bg-white">
            <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base text-[#0F172A]">
                    <ShieldCheck className="h-5 w-5 text-[#7C3AED]" aria-hidden />
                    Tu IA, tus reglas
                </CardTitle>
                <p className="text-sm text-[#475569]">
                    Decide cómo la IA{clubName ? ` de ${clubName}` : " del club"}{" "}
                    puede interactuar contigo. Puedes cambiarlo cuando quieras.
                </p>
            </CardHeader>
            <CardContent className="space-y-1">
                {status === "loading" && (
                    <div className="flex items-center gap-2 py-6 text-sm text-[#475569]">
                        <Spinner className="h-4 w-4" aria-hidden />
                        Cargando tus preferencias…
                    </div>
                )}
                {status === "error" && !prefs && (
                    <p className="py-6 text-sm text-[#DC2626]">{error}</p>
                )}
                {prefs &&
                    rows.map(({ key, icon: Icon, title, description }) => (
                        <div
                            key={key}
                            className="flex items-start gap-3 rounded-xl px-3 py-4 transition-colors duration-200 hover:bg-[#F7F3FD]"
                        >
                            <Icon
                                className="mt-0.5 h-5 w-5 shrink-0 text-[#7C3AED]"
                                aria-hidden
                            />
                            <div className="min-w-0 flex-1">
                                <p className="text-sm font-semibold text-[#0F172A]">
                                    {title}
                                </p>
                                <p className="mt-0.5 text-sm leading-relaxed text-[#475569]">
                                    {description}
                                </p>
                            </div>
                            <Switch
                                checked={prefs[key]}
                                onCheckedChange={(value) => toggle(key, value)}
                                disabled={status === "saving"}
                                aria-label={title}
                                className="mt-1 shrink-0 cursor-pointer data-[state=checked]:bg-[#7C3AED] focus-visible:ring-2 focus-visible:ring-[#7C3AED] focus-visible:ring-offset-2"
                            />
                        </div>
                    ))}
                {status === "saving" && (
                    <p className="flex items-center gap-2 px-3 pt-1 text-xs text-[#475569]">
                        <Spinner className="h-3 w-3" aria-hidden />
                        Guardando…
                    </p>
                )}
                {status === "error" && prefs && (
                    <p className="px-3 pt-1 text-xs text-[#DC2626]">{error}</p>
                )}
            </CardContent>
        </Card>
    )
}
