"use client"

/**
 * ActivityPulse — sentient UI club pulse indicator (master plan Phases 58-62).
 *
 * A subtle green/yellow/red dot summarizing recent club activity
 * (posts, joins, events), purely derived from `ai_signals` — no LLM.
 * Levels: active (green) / steady (yellow) / quiet (red).
 *
 * Live updates: subscribes to the `club-ai:{clubId}` broadcast channel
 * (sent by `recordAiSignal` after every club-level signal); a 60s poll
 * covers missed broadcasts.
 */
import { useCallback, useEffect, useState } from "react"

import { clubAiChannel } from "@/lib/ai/realtime"
import type { ClubPulse } from "@/lib/ai/ui-recommendations"
import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"

interface ActivityPulseProps {
    clubId: string
}

const LEVEL_META: Record<
    ClubPulse["level"],
    { dot: string; ring: string; label: string; description: string }
> = {
    active: {
        dot: "bg-emerald-500",
        ring: "bg-emerald-500/60",
        label: "Activo",
        description: "El club tiene buena actividad en las últimas 24 horas",
    },
    steady: {
        dot: "bg-amber-400",
        ring: "bg-amber-400/60",
        label: "Tranquilo",
        description: "El club tiene algo de actividad en las últimas 24 horas",
    },
    quiet: {
        dot: "bg-red-500",
        ring: "bg-red-500/60",
        label: "Apagado",
        description: "El club está apagado: casi sin actividad en las últimas 24 horas",
    },
}

async function fetchPulse(clubId: string): Promise<ClubPulse | null> {
    try {
        const res = await fetch(`/api/ai/pulse?clubId=${encodeURIComponent(clubId)}`, {
            credentials: "include",
        })
        if (!res.ok) return null
        const json = (await res.json()) as { data?: ClubPulse }
        return json.data ?? null
    } catch {
        return null
    }
}

export default function ActivityPulse({ clubId }: ActivityPulseProps) {
    const [pulse, setPulse] = useState<ClubPulse | null>(null)

    const load = useCallback(async () => {
        const next = await fetchPulse(clubId)
        if (next) setPulse(next)
    }, [clubId])

    useEffect(() => {
        void load()

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

    if (!pulse) return null
    const meta = LEVEL_META[pulse.level]

    return (
        <span
            className="flex items-center gap-1.5"
            title={`${meta.description} (${pulse.activityCount} señales en ${pulse.windowHours}h)`}
            aria-label={`Pulso del club: ${meta.label}. ${meta.description}`}
            role="status"
        >
            <span className="relative flex h-2.5 w-2.5" aria-hidden>
                {pulse.level === "active" && (
                    <span
                        className={cn(
                            "absolute inline-flex h-full w-full rounded-full opacity-60 motion-safe:animate-ping",
                            meta.ring,
                        )}
                    />
                )}
                <span className={cn("relative inline-flex h-2.5 w-2.5 rounded-full", meta.dot)} />
            </span>
            <span className="text-xs text-muted-foreground">{meta.label}</span>
        </span>
    )
}
