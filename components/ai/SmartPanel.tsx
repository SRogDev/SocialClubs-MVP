"use client"

/**
 * SmartPanel — sentient UI dashboard widget (master plan Phases 58-62).
 *
 * Shows the top 3 structured recommendations for the current club member,
 * derived deterministically from member_signals + ai_drafts + ai_signals
 * (no chat, no LLM). Every recommendation explains its reason ("porque X").
 *
 * Spanish-first. Dismissals are local-only (localStorage, no table).
 * Live updates: subscribes to the `club-ai:{clubId}` broadcast channel
 * (sent by `recordAiSignal` after every club-level signal) and refetches;
 * a 60s poll covers missed broadcasts.
 */
import { useCallback, useEffect, useMemo, useState } from "react"
import {
    ArrowRight,
    BellRing,
    Lightbulb,
    Loader2,
    Sparkles,
    UserPlus,
    X,
} from "lucide-react"
import Link from "next/link"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { clubAiChannel } from "@/lib/ai/realtime"
import { createClient } from "@/lib/supabase/client"
import type { UIRecommendation } from "@/lib/ai/ui-recommendations"
import { cn } from "@/lib/utils"

interface SmartPanelProps {
    clubId: string
    /** Accent color from the club theme. */
    accent?: string
}

const KIND_META: Record<
    UIRecommendation["kind"],
    { icon: typeof Sparkles; label: string }
> = {
    suggest_action: { icon: UserPlus, label: "Sugerencia" },
    highlight: { icon: BellRing, label: "Destacado" },
    nudge: { icon: Sparkles, label: "Empujón" },
    insight: { icon: Lightbulb, label: "Dato" },
}

/** Priority → visual weight: 5 red, 4 orange, 3 amber, 2 blue, 1 slate. */
function priorityStyles(priority: number): string {
    if (priority >= 5) return "border-red-500/40 bg-red-500/[0.06]"
    if (priority === 4) return "border-orange-500/40 bg-orange-500/[0.06]"
    if (priority === 3) return "border-amber-500/40 bg-amber-500/[0.06]"
    if (priority === 2) return "border-sky-500/40 bg-sky-500/[0.06]"
    return "border-border/60"
}

function dismissalKey(clubId: string): string {
    return `smartpanel:dismissed:${clubId}`
}

function loadDismissed(clubId: string): Set<string> {
    try {
        const raw = localStorage.getItem(dismissalKey(clubId))
        if (!raw) return new Set()
        const ids = JSON.parse(raw) as unknown
        return new Set(Array.isArray(ids) ? ids.filter((i): i is string => typeof i === "string") : [])
    } catch {
        return new Set()
    }
}

async function fetchRecommendations(clubId: string): Promise<UIRecommendation[]> {
    const res = await fetch(`/api/ai/recommendations?clubId=${encodeURIComponent(clubId)}`, {
        credentials: "include",
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const json = (await res.json()) as { data?: UIRecommendation[] }
    return Array.isArray(json.data) ? json.data : []
}

export default function SmartPanel({ clubId, accent = "#f97316" }: SmartPanelProps) {
    const [recommendations, setRecommendations] = useState<UIRecommendation[] | null>(null)
    const [dismissed, setDismissed] = useState<Set<string>>(() => loadDismissed(clubId))
    const [error, setError] = useState(false)

    const load = useCallback(async () => {
        try {
            setRecommendations(await fetchRecommendations(clubId))
            setError(false)
        } catch {
            setError(true)
        }
    }, [clubId])

    useEffect(() => {
        setDismissed(loadDismissed(clubId))
        void load()

        // Live updates: broadcast sent by recordAiSignal after each club
        // signal; 60s poll covers missed broadcasts.
        const supabase = createClient()
        const channel = supabase
            .channel(clubAiChannel(clubId))
            .on("broadcast", { event: "signals-changed" }, () => {
                void load()
            })
            .subscribe()
        const timer = setInterval(() => void load(), 60_000)
        return () => {
            clearInterval(timer)
            void supabase.removeChannel(channel)
        }
    }, [clubId, load])

    const dismiss = useCallback(
        (id: string) => {
            setDismissed((prev) => {
                const next = new Set(prev)
                next.add(id)
                try {
                    localStorage.setItem(dismissalKey(clubId), JSON.stringify([...next]))
                } catch {
                    /* storage full/blocked — dismissal just won't persist */
                }
                return next
            })
        },
        [clubId],
    )

    const visible = useMemo(() => {
        if (!recommendations) return []
        const now = Date.now()
        return recommendations
            .filter((r) => !dismissed.has(r.id))
            .filter((r) => new Date(r.expiresAt).getTime() > now)
            .slice(0, 3)
    }, [recommendations, dismissed])

    if (recommendations === null && !error) {
        return (
            <div className="px-3 pt-3 md:px-6" aria-label="Sugerencias del club">
                <Card>
                    <CardContent className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                        Cargando sugerencias…
                    </CardContent>
                </Card>
            </div>
        )
    }

    if (error || visible.length === 0) return null

    return (
        <section aria-label="Sugerencias del club" aria-live="polite" className="px-3 pt-3 md:px-6">
            <Card className="overflow-hidden">
                <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                        <span
                            className="flex h-7 w-7 items-center justify-center rounded-lg"
                            style={{ backgroundColor: `${accent}1a`, color: accent }}
                            aria-hidden
                        >
                            <Sparkles size={15} />
                        </span>
                        Sugerencias para ti
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2.5 pt-1">
                    {visible.map((rec) => {
                        const meta = KIND_META[rec.kind]
                        const Icon = meta.icon
                        return (
                            <article
                                key={rec.id}
                                className={cn(
                                    "relative rounded-xl border p-3 pl-3.5",
                                    priorityStyles(rec.priority),
                                )}
                            >
                                <div className="flex items-start gap-2.5">
                                    <span
                                        className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-background/70"
                                        style={{ color: accent }}
                                        aria-hidden
                                    >
                                        <Icon size={16} />
                                    </span>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2">
                                            <h3 className="text-sm font-semibold leading-tight">
                                                {rec.title}
                                            </h3>
                                            <Badge variant="outline" className="shrink-0 text-[10px]">
                                                {meta.label}
                                            </Badge>
                                        </div>
                                        <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
                                            {rec.body}
                                        </p>
                                        {rec.action && (
                                            <Button
                                                variant="link"
                                                size="sm"
                                                className="mt-1 h-auto p-0 text-[13px] font-medium"
                                                style={{ color: accent }}
                                                asChild
                                            >
                                                <Link href={rec.action.href}>
                                                    {rec.action.label}
                                                    <ArrowRight size={14} className="ml-1" aria-hidden />
                                                </Link>
                                            </Button>
                                        )}
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-9 w-9 shrink-0 text-muted-foreground hover:text-foreground"
                                        onClick={() => dismiss(rec.id)}
                                        aria-label={`Descartar: ${rec.title}`}
                                    >
                                        <X size={16} aria-hidden />
                                    </Button>
                                </div>
                            </article>
                        )
                    })}
                </CardContent>
            </Card>
        </section>
    )
}
