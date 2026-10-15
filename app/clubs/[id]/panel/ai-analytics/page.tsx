import { Activity, CheckCircle2, CircleDot, GitBranch, Info, Link2Off, PauseCircle } from "lucide-react"
import { redirect } from "next/navigation"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { getClubAnalytics, supabaseAnalyticsDb, type AgentHealthStatus, type ClubAnalytics } from "@/lib/ai/analytics"
import { AIAgentError } from "@/lib/ai/types"
import { AuthorizationError, requireClubRole } from "@/lib/authz"
import { createClient } from "@/lib/supabase/server"

const STATUS_DOT: Record<AgentHealthStatus, string> = {
    healthy: "bg-emerald-500",
    degraded: "bg-amber-500",
    idle: "bg-sky-400",
    disabled: "bg-stone-300 dark:bg-stone-600",
}

const STATUS_LABEL: Record<AgentHealthStatus, string> = {
    healthy: "Saludable",
    degraded: "Degradado",
    idle: "Sin actividad",
    disabled: "Desactivado",
}

const STATUS_ICON: Record<AgentHealthStatus, typeof CheckCircle2> = {
    healthy: CheckCircle2,
    degraded: Activity,
    idle: PauseCircle,
    disabled: Link2Off,
}

function relativeEs(iso: string | null): string {
    if (!iso) return "Sin registros"
    const diffMs = Date.now() - new Date(iso).getTime()
    if (diffMs < 0) return "Ahora mismo"
    const minutes = Math.floor(diffMs / 60000)
    if (minutes < 1) return "Hace un momento"
    if (minutes < 60) return `Hace ${minutes} min`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `Hace ${hours} h`
    const days = Math.floor(hours / 24)
    return days === 1 ? "Hace 1 día" : `Hace ${days} días`
}

function pct(n: number | null): string {
    if (n === null) return "—"
    return `${Math.round(n * 100)}%`
}

function FunnelBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
    const width = max > 0 ? Math.max(Math.round((value / max) * 100), value > 0 ? 3 : 0) : 0
    return (
        <div className="space-y-1">
            <div className="flex items-center justify-between text-sm">
                <span className="font-medium">{label}</span>
                <span className="font-semibold tabular-nums">{value}</span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
                <div className={`h-full rounded-full ${color}`} style={{ width: `${width}%` }} />
            </div>
        </div>
    )
}

function CorrelationBadge({ coefficient }: { coefficient: number | null }) {
    if (coefficient === null) {
        return <Badge variant="outline">Sin datos suficientes</Badge>
    }
    const strength =
        Math.abs(coefficient) >= 0.7 ? "Fuerte" : Math.abs(coefficient) >= 0.4 ? "Moderada" : "Débil"
    const direction = coefficient > 0 ? "positiva" : "negativa"
    return (
        <Badge variant={Math.abs(coefficient) >= 0.4 ? "secondary" : "outline"}>
            Correlación {strength} {direction}: {coefficient.toFixed(2)}
        </Badge>
    )
}

export default async function AIAnalyticsPage({
    params,
}: {
    params: Promise<{ id: string }>
}) {
    const { id: clubId } = await params

    const supabase = await createClient()
    const { data, error } = await supabase.auth.getClaims()
    if (error || !data?.claims) {
        redirect("/auth/login")
    }
    const userId = data.claims.sub as string
    try {
        await requireClubRole(userId, clubId, ["owner", "admin"])
    } catch (err) {
        if (err instanceof AuthorizationError) {
            redirect(`/clubs/${clubId}/panel/general`)
        }
        throw err
    }

    let analytics: ClubAnalytics | null = null
    let dbError: string | null = null
    try {
        analytics = await getClubAnalytics(clubId, 30, { db: supabaseAnalyticsDb() })
    } catch (err) {
        if (err instanceof AIAgentError && err.code === "AI_DB_UNAVAILABLE") {
            dbError = "La base de datos de IA no está configurada todavía."
        } else {
            throw err
        }
    }

    return (
        <div className="mx-auto max-w-4xl space-y-6 p-6">
            <div>
                <h1 className="text-2xl font-bold">Analítica del staff de IA</h1>
                <p className="text-muted-foreground">
                    Salud de los agentes, embudo de acciones y su impacto en el club · últimos 30 días
                </p>
            </div>

            {dbError && (
                <Alert>
                    <Info className="h-4 w-4" />
                    <AlertTitle>No disponible</AlertTitle>
                    <AlertDescription>{dbError}</AlertDescription>
                </Alert>
            )}

            {analytics && (
                <>
                    {/* Staff health cards */}
                    <section className="space-y-3">
                        <h2 className="text-lg font-semibold">Salud del staff</h2>
                        <div className="grid gap-4 md:grid-cols-3">
                            {analytics.health.map((h) => {
                                const Icon = STATUS_ICON[h.status]
                                return (
                                    <Card key={h.agentId}>
                                        <CardHeader className="pb-2">
                                            <CardTitle className="flex items-center gap-2 text-base">
                                                <span className={`h-2.5 w-2.5 rounded-full ${STATUS_DOT[h.status]}`} />
                                                {h.label}
                                            </CardTitle>
                                            <CardDescription className="flex items-center gap-1.5">
                                                <Icon className="h-3.5 w-3.5" />
                                                {STATUS_LABEL[h.status]}
                                            </CardDescription>
                                        </CardHeader>
                                        <CardContent className="grid grid-cols-2 gap-2 text-sm">
                                            <div>
                                                <div className="text-muted-foreground">Tasa de éxito</div>
                                                <div className="font-semibold tabular-nums">{pct(h.successRate)}</div>
                                            </div>
                                            <div>
                                                <div className="text-muted-foreground">Tasa de error</div>
                                                <div className="font-semibold tabular-nums">{pct(h.errorRate)}</div>
                                            </div>
                                            <div>
                                                <div className="text-muted-foreground">Última ejecución</div>
                                                <div className="font-semibold">{relativeEs(h.lastRunAt)}</div>
                                            </div>
                                            <div>
                                                <div className="text-muted-foreground">Latencia media</div>
                                                <div className="font-semibold tabular-nums">
                                                    {h.avgLatencyMs !== null ? `${h.avgLatencyMs} ms` : "—"}
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                )
                            })}
                        </div>
                    </section>

                    {/* Action funnel */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <GitBranch className="h-5 w-5" />
                                Embudo de acciones
                            </CardTitle>
                            <CardDescription>
                                De lo que la IA propone a lo que realmente se ejecuta
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <FunnelBar label="Propuestas" value={analytics.stats.funnel.proposed} max={analytics.stats.funnel.proposed} color="bg-sky-500" />
                            <FunnelBar label="Aprobadas (revisión humana)" value={analytics.stats.funnel.approved} max={analytics.stats.funnel.proposed} color="bg-emerald-500" />
                            <FunnelBar label="Ejecutadas" value={analytics.stats.funnel.executed} max={analytics.stats.funnel.proposed} color="bg-violet-500" />
                            <FunnelBar label="Pendientes" value={analytics.stats.funnel.pending} max={analytics.stats.funnel.proposed} color="bg-amber-500" />
                        </CardContent>
                    </Card>

                    {/* Approval rate + by type */}
                    <div className="grid gap-4 md:grid-cols-2">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <CircleDot className="h-5 w-5" />
                                    Tasa de aprobación
                                </CardTitle>
                                <CardDescription>
                                    Decisiones humanas sobre borradores de IA
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                {analytics.stats.approvalRate !== null ? (
                                    <div className="space-y-3">
                                        <div className="text-4xl font-bold tabular-nums">
                                            {pct(analytics.stats.approvalRate)}
                                        </div>
                                        <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
                                            <div
                                                className="h-full rounded-full bg-emerald-500"
                                                style={{ width: `${analytics.stats.approvalRate * 100}%` }}
                                            />
                                        </div>
                                        <p className="text-sm text-muted-foreground">
                                            {analytics.stats.approvedCount} aprobadas ·{" "}
                                            {analytics.stats.rejectedCount} rechazadas
                                        </p>
                                    </div>
                                ) : (
                                    <p className="text-sm text-muted-foreground">
                                        Aún no hay decisiones humanas de aprobación o rechazo en este período.
                                    </p>
                                )}
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader>
                                <CardTitle>Acciones por tipo</CardTitle>
                                <CardDescription>Las más propuestas en 30 días</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                {analytics.stats.byType.length === 0 && (
                                    <p className="text-sm text-muted-foreground">
                                        Sin acciones registradas en este período.
                                    </p>
                                )}
                                {analytics.stats.byType.slice(0, 6).map((t) => (
                                    <FunnelBar
                                        key={t.type}
                                        label={t.type}
                                        value={t.count}
                                        max={analytics.stats.byType[0]?.count ?? 1}
                                        color="bg-sky-500"
                                    />
                                ))}
                            </CardContent>
                        </Card>
                    </div>

                    {/* Engagement impact (honestly labeled correlations) */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Impacto en la comunidad</CardTitle>
                            <CardDescription>
                                Correlaciones semanales entre el trabajo de la IA y la actividad del club
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {analytics.engagement.correlations.map((c) => (
                                <div key={c.name} className="space-y-1.5 rounded-lg border p-4">
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                        <span className="font-medium">{c.description}</span>
                                        <CorrelationBadge coefficient={c.coefficient} />
                                    </div>
                                    <p className="text-sm text-muted-foreground">
                                        {c.caveat}{" "}
                                        <span className="italic">
                                            (basado en {c.sampleBuckets} semanas)
                                        </span>
                                    </p>
                                </div>
                            ))}
                        </CardContent>
                    </Card>

                    {/* Trust explanations */}
                    <section className="space-y-3">
                        <h2 className="text-lg font-semibold">Qué hace cada agente (y qué no)</h2>
                        <div className="grid gap-4 md:grid-cols-2">
                            {analytics.health.map((h) => (
                                <Card key={h.agentId}>
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-base">{h.label}</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-2 text-sm">
                                        <p>
                                            <span className="font-semibold">Qué hace: </span>
                                            {h.trustExplanation.what}
                                        </p>
                                        <p className="text-muted-foreground">
                                            <span className="font-semibold text-foreground">Sus límites: </span>
                                            {h.trustExplanation.limits}
                                        </p>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </section>
                </>
            )}
        </div>
    )
}
