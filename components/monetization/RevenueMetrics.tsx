import { Users, DollarSign, Calendar, TrendingUp } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface RevenueMetricsProps {
    mrr: number; // Monthly Recurring Revenue en centavos
    activeSubscribers: number;
    clubId: string;
}

/**
 * RevenueMetrics Component
 * 
 * Muestra métricas clave de ingresos:
 * - MRR (Monthly Recurring Revenue)
 * - Suscriptores activos
 * - ARR proyectado
 */
export function RevenueMetrics({
    mrr,
    activeSubscribers,
}: RevenueMetricsProps) {
    const formatCurrency = (cents: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
        }).format(cents / 100);
    };

    const arr = mrr * 12; // Annual Recurring Revenue

    return (
        <Card>
            <CardHeader>
                <CardTitle>Métricas de Ingresos Recurrentes</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    {/* MRR */}
                    <div className="space-y-2">
                        <div className="flex items-center gap-2 text-muted-foreground">
                            <Calendar className="h-4 w-4" />
                            <span className="text-sm">MRR</span>
                        </div>
                        <div className="text-2xl font-bold">{formatCurrency(mrr)}</div>
                        <p className="text-xs text-muted-foreground">
                            Ingresos mensuales recurrentes
                        </p>
                    </div>

                    {/* ARR */}
                    <div className="space-y-2">
                        <div className="flex items-center gap-2 text-muted-foreground">
                            <TrendingUp className="h-4 w-4" />
                            <span className="text-sm">ARR Proyectado</span>
                        </div>
                        <div className="text-2xl font-bold">{formatCurrency(arr)}</div>
                        <p className="text-xs text-muted-foreground">
                            Proyección anual (MRR × 12)
                        </p>
                    </div>

                    {/* Active Subscribers */}
                    <div className="space-y-2">
                        <div className="flex items-center gap-2 text-muted-foreground">
                            <Users className="h-4 w-4" />
                            <span className="text-sm">Suscriptores</span>
                        </div>
                        <div className="text-2xl font-bold">{activeSubscribers}</div>
                        <p className="text-xs text-muted-foreground">Activos actualmente</p>
                    </div>

                    {/* ARPU */}
                    <div className="space-y-2">
                        <div className="flex items-center gap-2 text-muted-foreground">
                            <DollarSign className="h-4 w-4" />
                            <span className="text-sm">ARPU</span>
                        </div>
                        <div className="text-2xl font-bold">
                            {activeSubscribers > 0
                                ? formatCurrency(Math.round(mrr / activeSubscribers))
                                : '$0.00'}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Ingreso promedio por usuario
                        </p>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
