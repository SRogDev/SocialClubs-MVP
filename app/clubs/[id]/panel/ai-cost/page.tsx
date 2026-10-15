import { AlertTriangle, Ban, Coins, Info, Wallet } from "lucide-react"
import { redirect } from "next/navigation"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { AuthorizationError, requireClubRole } from "@/lib/authz"
import { supabaseCostDb } from "@/lib/ai/cost"
import { getBudgetStatus, getClubSpend } from "@/lib/ai/cost-dashboard"
import { AIAgentError } from "@/lib/ai/types"
import { createClient } from "@/lib/supabase/server"

const AGENT_LABELS: Record<string, string> = {
    "community-manager": "Community Manager",
    "experience-director": "Director de Experiencia",
    "creator-copilot": "Copiloto del creador",
    moderation: "Moderación IA",
}

function agentLabel(id: string): string {
    return AGENT_LABELS[id] ?? id
}

function usd(n: number): string {
    return `$${n.toFixed(4)}`
}

function currentMonthId(): string {
    const now = new Date()
    return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`
}

function monthLabelEs(): string {
    return new Date().toLocaleDateString("es-ES", { month: "long", year: "numeric" })
}

export default async function AICostPage({
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

    const month = currentMonthId()
    let spend: Awaited<ReturnType<typeof getClubSpend>> | null = null
    let budget: Awaited<ReturnType<typeof getBudgetStatus>> | null = null
    let dbError: string | null = null
    try {
        const deps = { db: supabaseCostDb() }
        ;[spend, budget] = await Promise.all([
            getClubSpend(clubId, month, deps),
            getBudgetStatus(clubId, deps),
        ])
    } catch (err) {
        if (err instanceof AIAgentError && err.code === "AI_DB_UNAVAILABLE") {
            dbError = "La base de datos de costos de IA no está configurada todavía."
        } else {
            throw err
        }
    }

    return (
        <div className="mx-auto max-w-4xl space-y-6 p-6">
            <div>
                <h1 className="text-2xl font-bold">Costo de IA</h1>
                <p className="text-muted-foreground">
                    Consumo de los agentes de IA del club · {monthLabelEs()}
                </p>
            </div>

            {dbError && (
                <Alert>
                    <Info className="h-4 w-4" />
                    <AlertTitle>No disponible</AlertTitle>
                    <AlertDescription>{dbError}</AlertDescription>
                </Alert>
            )}

            {budget && budget.warningLevel !== "ok" && (
                <Alert variant={budget.warningLevel === "critical" ? "destructive" : "default"}>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>
                        {budget.warningLevel === "critical"
                            ? "Presupuesto de IA agotado"
                            : "Presupuesto de IA casi agotado"}
                    </AlertTitle>
                    <AlertDescription>
                        Has usado el {Math.round(budget.percentUsed)}% del presupuesto mensual
                        (${budget.spentUsd.toFixed(2)} de ${budget.monthlyCapUsd.toFixed(2)}).
                        {budget.warningLevel === "critical"
                            ? " Las funciones de IA están pausadas hasta el próximo mes."
                            : " Recibirás una notificación al llegar al límite."}
                    </AlertDescription>
                </Alert>
            )}

            {budget && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Wallet className="h-5 w-5" />
                            Presupuesto del mes
                        </CardTitle>
                        <CardDescription>
                            Límite mensual de gasto en IA para este club
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-end justify-between">
                            <div className="text-3xl font-bold">
                                ${budget.spentUsd.toFixed(2)}
                                <span className="text-base font-normal text-muted-foreground">
                                    {" "}/ ${budget.monthlyCapUsd.toFixed(2)}
                                </span>
                            </div>
                            <Badge
                                variant={
                                    budget.warningLevel === "ok"
                                        ? "secondary"
                                        : budget.warningLevel === "warning"
                                          ? "outline"
                                          : "destructive"
                                }
                            >
                                {Math.round(budget.percentUsed)}% usado
                            </Badge>
                        </div>
                        <Progress value={Math.min(budget.percentUsed, 100)} />
                        <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
                            <div>
                                <div className="text-muted-foreground">Gastado</div>
                                <div className="font-semibold">${budget.spentUsd.toFixed(2)}</div>
                            </div>
                            <div>
                                <div className="text-muted-foreground">Restante</div>
                                <div className="font-semibold">${budget.remainingUsd.toFixed(2)}</div>
                            </div>
                            <div>
                                <div className="text-muted-foreground">Llamadas</div>
                                <div className="font-semibold">{spend?.calls ?? 0}</div>
                            </div>
                            <div>
                                <div className="text-muted-foreground">Proyección fin de mes</div>
                                <div className="font-semibold">
                                    ~${budget.projectedSpendUsd.toFixed(2)}
                                </div>
                            </div>
                        </div>
                        {budget.projectedOverrunUsd > 0 && (
                            <p className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400">
                                <AlertTriangle className="h-4 w-4" />
                                Al ritmo actual, el mes cerraría ${budget.projectedOverrunUsd.toFixed(2)} por
                                encima del presupuesto.
                            </p>
                        )}
                        {budget.disabled && (
                            <p className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Ban className="h-4 w-4" />
                                La IA está desactivada para este club.
                            </p>
                        )}
                    </CardContent>
                </Card>
            )}

            {spend && spend.calls > 0 ? (
                <>
                    <Card>
                        <CardHeader>
                            <CardTitle>Por agente</CardTitle>
                            <CardDescription>Desglose del gasto por agente de IA</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Agente</TableHead>
                                        <TableHead className="text-right">Llamadas</TableHead>
                                        <TableHead className="text-right">Tokens</TableHead>
                                        <TableHead className="text-right">Costo</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {spend.byAgent.map((a) => (
                                        <TableRow key={a.agentId}>
                                            <TableCell className="font-medium">
                                                {agentLabel(a.agentId)}
                                            </TableCell>
                                            <TableCell className="text-right">{a.calls}</TableCell>
                                            <TableCell className="text-right">
                                                {(a.promptTokens + a.completionTokens).toLocaleString("es-ES")}
                                            </TableCell>
                                            <TableCell className="text-right">{usd(a.costUsd)}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Por acción</CardTitle>
                            <CardDescription>Desglose del gasto por tipo de acción</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Acción</TableHead>
                                        <TableHead className="text-right">Llamadas</TableHead>
                                        <TableHead className="text-right">Tokens</TableHead>
                                        <TableHead className="text-right">Costo</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {spend.byWorkflow.map((w) => (
                                        <TableRow key={w.workflow}>
                                            <TableCell className="font-medium">{w.workflow}</TableCell>
                                            <TableCell className="text-right">{w.calls}</TableCell>
                                            <TableCell className="text-right">
                                                {(w.promptTokens + w.completionTokens).toLocaleString("es-ES")}
                                            </TableCell>
                                            <TableCell className="text-right">{usd(w.costUsd)}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </>
            ) : (
                spend && (
                    <Card>
                        <CardContent className="py-10 text-center text-muted-foreground">
                            <Coins className="mx-auto mb-3 h-8 w-8 opacity-50" />
                            Sin consumo de IA este mes.
                        </CardContent>
                    </Card>
                )
            )}

            <Card>
                <CardContent className="flex items-start gap-3 py-4 text-sm text-muted-foreground">
                    <Info className="mt-0.5 h-4 w-4 shrink-0" />
                    <div className="space-y-1">
                        <p>Los costos de IA están incluidos en el margen de la plataforma.</p>
                        <p>
                            El costo como % de los ingresos del club se mostrará cuando los datos de
                            facturación estén conectados.
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
