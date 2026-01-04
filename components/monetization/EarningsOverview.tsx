import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, TrendingUp, Wallet } from 'lucide-react';

interface EarningsOverviewProps {
    totalEarnings: number;
    availableBalance: number;
    isActive: boolean;
}

/**
 * EarningsOverview Component
 * 
 * Muestra resumen de ingresos totales y balance disponible.
 * Cantidades en centavos, se formatean a dólares.
 */
export function EarningsOverview({
    totalEarnings,
    availableBalance,
    isActive,
}: EarningsOverviewProps) {
    const formatCurrency = (cents: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
        }).format(cents / 100);
    };

    const pendingBalance = totalEarnings - availableBalance;

    return (
        <div className="grid gap-4 md:grid-cols-3">
            {/* Total Earnings */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Ingresos Totales</CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{formatCurrency(totalEarnings)}</div>
                    <p className="text-xs text-muted-foreground">Desde el inicio</p>
                </CardContent>
            </Card>

            {/* Available Balance */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Balance Disponible</CardTitle>
                    <Wallet className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-green-600">
                        {formatCurrency(availableBalance)}
                    </div>
                    <p className="text-xs text-muted-foreground">
                        {isActive ? 'Listo para retiro' : 'Activa tu cuenta'}
                    </p>
                </CardContent>
            </Card>

            {/* Pending Balance */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Balance Pendiente</CardTitle>
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-yellow-600">
                        {formatCurrency(pendingBalance)}
                    </div>
                    <p className="text-xs text-muted-foreground">En procesamiento</p>
                </CardContent>
            </Card>
        </div>
    );
}
