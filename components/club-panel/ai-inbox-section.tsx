"use client"

/**
 * AI Inbox section — the creator's trust center for the AI staff
 * (Spanish-first UI).
 *
 * Tabs: Pendientes / Aprobadas / Rechazadas / Ejecutadas. Pending cards
 * carry Approve / Reject buttons with an optional feedback field and
 * optimistic UI (the card leaves the pending list immediately; a failed
 * request rolls it back). Every card shows the audit trail: who proposed
 * the action, what the policy said, and the recorded reviews.
 */
import { useCallback, useEffect, useRef, useState } from "react"
import { Check, Inbox, Loader2, X } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import {
    actionLabelEs,
    agentDisplayName,
    agentInitials,
    policySummaryEs,
    previewActionInputs,
    reviewDecisionLabelEs,
    riskOf,
    RISK_BADGE_CLASSES,
    RISK_LABELS_ES,
    statusLabelEs,
} from "@/lib/ai/inbox-display"
import { cn } from "@/lib/utils"

interface InboxReview {
    id: string
    reviewerType: "ai" | "human"
    reviewerId: string | null
    decision: string
    feedback: string | null
    createdAt: string
}

interface InboxAction {
    id: string
    clubId: string
    agentId: string
    action: string
    inputs: unknown
    idempotencyKey: string
    status: string
    policyResult: unknown
    reviewResult: unknown
    executionResult: unknown
    createdAt: string
    reviews: InboxReview[]
}

const TABS = [
    { id: "pendientes", label: "Pendientes", statuses: "pending_approval,draft" },
    { id: "aprobadas", label: "Aprobadas", statuses: "executed", humanDecision: "approved" },
    { id: "rechazadas", label: "Rechazadas", statuses: "rejected" },
    { id: "ejecutadas", label: "Ejecutadas", statuses: "executed" },
] as const

type TabId = (typeof TABS)[number]["id"]

const EMPTY_STATE_ES: Record<TabId, string> = {
    pendientes: "No hay borradores pendientes. Tu equipo de IA está al día.",
    aprobadas: "Aún no has aprobado ninguna acción.",
    rechazadas: "No has rechazado ninguna acción.",
    ejecutadas: "No hay acciones ejecutadas todavía.",
}

const dateFormatter = new Intl.DateTimeFormat("es-ES", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
})

function formatDate(iso: string): string {
    const d = new Date(iso)
    return Number.isNaN(d.getTime()) ? iso : dateFormatter.format(d)
}

type DecideState = Record<string, "approve" | "reject">

export default function AiInboxSection({ clubId }: { clubId: string }) {
    const [tab, setTab] = useState<TabId>("pendientes")
    const [itemsByTab, setItemsByTab] = useState<Record<TabId, InboxAction[]>>({
        pendientes: [],
        aprobadas: [],
        rechazadas: [],
        ejecutadas: [],
    })
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [feedback, setFeedback] = useState<Record<string, string>>({})
    const [deciding, setDeciding] = useState<DecideState>({})
    const mounted = useRef(true)

    useEffect(() => {
        mounted.current = true
        return () => {
            mounted.current = false
        }
    }, [])

    const loadTab = useCallback(
        async (tabId: TabId, opts?: { silent?: boolean }) => {
            const tabDef = TABS.find((t) => t.id === tabId)
            if (!tabDef) return
            if (!opts?.silent) setLoading(true)
            setError(null)
            try {
                const qs = new URLSearchParams({
                    clubId,
                    status: tabDef.statuses,
                })
                if ("humanDecision" in tabDef && tabDef.humanDecision) {
                    qs.set("humanDecision", tabDef.humanDecision)
                }
                const res = await fetch(`/api/ai/inbox?${qs.toString()}`)
                const body = (await res.json()) as {
                    data?: { actions?: InboxAction[] }
                    error?: string
                }
                if (!res.ok) {
                    throw new Error(body?.error ?? `Error ${res.status}`)
                }
                if (mounted.current) {
                    setItemsByTab((prev) => ({
                        ...prev,
                        [tabId]: body.data?.actions ?? [],
                    }))
                }
            } catch (err) {
                if (mounted.current) {
                    setError(
                        err instanceof Error
                            ? err.message
                            : "No se pudo cargar la bandeja",
                    )
                }
            } finally {
                if (mounted.current && !opts?.silent) setLoading(false)
            }
        },
        [clubId],
    )

    useEffect(() => {
        void loadTab(tab)
    }, [tab, loadTab])

    const decide = useCallback(
        async (action: InboxAction, decision: "approve" | "reject") => {
            const id = action.id
            setDeciding((prev) => ({ ...prev, [id]: decision }))
            // Optimistic: the card leaves the pending list immediately.
            setItemsByTab((prev) => ({
                ...prev,
                pendientes: prev.pendientes.filter((a) => a.id !== id),
            }))
            try {
                const note = (feedback[id] ?? "").trim()
                const res = await fetch(`/api/ai/inbox/${id}`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        decision,
                        ...(note ? { feedback: note } : {}),
                    }),
                })
                const body = (await res.json()) as { error?: string }
                if (!res.ok) {
                    throw new Error(body?.error ?? `Error ${res.status}`)
                }
                // Refresh the current tab when it isn't the pending list.
                if (tab !== "pendientes") {
                    await loadTab(tab, { silent: true })
                }
            } catch (err) {
                // Rollback: put the card back where it was.
                if (mounted.current) {
                    setItemsByTab((prev) => ({
                        ...prev,
                        pendientes: [action, ...prev.pendientes],
                    }))
                    setError(
                        err instanceof Error
                            ? err.message
                            : "No se pudo registrar la decisión",
                    )
                }
            } finally {
                if (mounted.current) {
                    setDeciding((prev) => {
                        const next = { ...prev }
                        delete next[id]
                        return next
                    })
                }
            }
        },
        [feedback, tab, loadTab],
    )

    const pendingCount = itemsByTab.pendientes.length

    return (
        <div className="space-y-6 p-6">
            <div>
                <h1 className="flex items-center gap-2 text-2xl font-bold">
                    <Inbox size={22} />
                    Bandeja IA
                </h1>
                <p className="mt-1 text-muted-foreground">
                    Revisa y decide sobre lo que propone tu equipo de IA. Nada
                    se ejecuta sin tu aprobación.
                </p>
            </div>

            {error && (
                <div className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm">
                    {error}
                </div>
            )}

            <Tabs
                value={tab}
                onValueChange={(v) => setTab(v as TabId)}
                className="w-full"
            >
                <TabsList>
                    {TABS.map((t) => (
                        <TabsTrigger key={t.id} value={t.id}>
                            {t.label}
                            {t.id === "pendientes" && pendingCount > 0 && (
                                <span className="ml-1 rounded-full bg-primary px-1.5 py-0.5 text-xs font-semibold text-primary-foreground">
                                    {pendingCount}
                                </span>
                            )}
                        </TabsTrigger>
                    ))}
                </TabsList>

                {TABS.map((t) => (
                    <TabsContent key={t.id} value={t.id} className="space-y-4">
                        {loading ? (
                            <div className="space-y-4">
                                <Skeleton className="h-40 w-full" />
                                <Skeleton className="h-40 w-full" />
                            </div>
                        ) : itemsByTab[t.id].length === 0 ? (
                            <Card>
                                <CardContent className="py-12 text-center text-muted-foreground">
                                    {EMPTY_STATE_ES[t.id]}
                                </CardContent>
                            </Card>
                        ) : (
                            itemsByTab[t.id].map((item) => (
                                <ActionCard
                                    key={item.id}
                                    item={item}
                                    pending={t.id === "pendientes"}
                                    busy={deciding[item.id]}
                                    feedback={feedback[item.id] ?? ""}
                                    onFeedbackChange={(v) =>
                                        setFeedback((prev) => ({
                                            ...prev,
                                            [item.id]: v,
                                        }))
                                    }
                                    onDecide={(d) => void decide(item, d)}
                                />
                            ))
                        )}
                    </TabsContent>
                ))}
            </Tabs>
        </div>
    )
}

function ActionCard({
    item,
    pending,
    busy,
    feedback,
    onFeedbackChange,
    onDecide,
}: {
    item: InboxAction
    pending: boolean
    busy: "approve" | "reject" | undefined
    feedback: string
    onFeedbackChange: (v: string) => void
    onDecide: (d: "approve" | "reject") => void
}) {
    const risk = riskOf(item.action)
    const policySummary = policySummaryEs(item.policyResult)
    const preview = previewActionInputs(item.action, item.inputs)

    return (
        <Card>
            <CardHeader className="flex flex-row items-start gap-3 space-y-0">
                <div
                    aria-hidden
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary"
                >
                    {agentInitials(item.agentId)}
                </div>
                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold">
                            {agentDisplayName(item.agentId)}
                        </span>
                        <span className="text-sm text-muted-foreground">
                            · {actionLabelEs(item.action)}
                        </span>
                        {risk && (
                            <Badge className={cn(RISK_BADGE_CLASSES[risk])}>
                                {RISK_LABELS_ES[risk]}
                            </Badge>
                        )}
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                        {formatDate(item.createdAt)} ·{" "}
                        {statusLabelEs(item.status)}
                    </p>
                </div>
            </CardHeader>
            <CardContent className="space-y-3">
                {preview && <p className="text-sm">{preview}</p>}
                {policySummary && (
                    <p className="text-xs text-muted-foreground">
                        Política: {policySummary}
                    </p>
                )}

                {pending && (
                    <div className="space-y-2 pt-1">
                        <Textarea
                            rows={2}
                            value={feedback}
                            onChange={(e) => onFeedbackChange(e.target.value)}
                            placeholder="Comentario opcional para el registro…"
                            disabled={!!busy}
                        />
                        <div className="flex gap-2">
                            <Button
                                size="sm"
                                onClick={() => onDecide("approve")}
                                disabled={!!busy}
                            >
                                {busy === "approve" ? (
                                    <Loader2 size={16} className="animate-spin" />
                                ) : (
                                    <Check size={16} />
                                )}
                                Aprobar y ejecutar
                            </Button>
                            <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => onDecide("reject")}
                                disabled={!!busy}
                            >
                                {busy === "reject" ? (
                                    <Loader2 size={16} className="animate-spin" />
                                ) : (
                                    <X size={16} />
                                )}
                                Rechazar
                            </Button>
                        </div>
                    </div>
                )}

                <details className="text-xs">
                    <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                        Ver trazabilidad
                    </summary>
                    <div className="mt-2 space-y-1.5 rounded-md bg-muted/50 p-3">
                        <p>
                            <span className="font-medium">Propuesto por:</span>{" "}
                            {agentDisplayName(item.agentId)} ·{" "}
                            {formatDate(item.createdAt)}
                        </p>
                        <p className="break-all">
                            <span className="font-medium">Idempotencia:</span>{" "}
                            {item.idempotencyKey}
                        </p>
                        {item.reviews.length === 0 ? (
                            <p className="text-muted-foreground">
                                Sin revisiones registradas.
                            </p>
                        ) : (
                            item.reviews.map((r) => (
                                <p key={r.id}>
                                    <span className="font-medium">
                                        {r.reviewerType === "human"
                                            ? "Humano"
                                            : "Revisor IA"}
                                        :
                                    </span>{" "}
                                    {reviewDecisionLabelEs(r.decision)}
                                    {r.feedback ? ` — ${r.feedback}` : ""}{" "}
                                    <span className="text-muted-foreground">
                                        ({formatDate(r.createdAt)})
                                    </span>
                                </p>
                            ))
                        )}
                    </div>
                </details>
            </CardContent>
        </Card>
    )
}
