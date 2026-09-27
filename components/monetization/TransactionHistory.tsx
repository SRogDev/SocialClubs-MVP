import { Badge } from '@/components/ui/badge';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';

import type { Payment } from '@/types/database';

interface TransactionHistoryProps {
    transactions: Payment[];
}

/**
 * TransactionHistory Component
 * 
 * Tabla de transacciones históricas con:
 * - Tipo de transacción
 * - Monto
 * - Estado
 * - Fecha
 */
export function TransactionHistory({ transactions }: TransactionHistoryProps) {
    const formatCurrency = (cents: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
        }).format(cents / 100);
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const getTxnTypeLabel = (type: string) => {
        const labels: Record<string, string> = {
            payment: 'Pago',
            payout: 'Retiro',
            fee: 'Comisión',
            refund: 'Reembolso',
        };
        return labels[type] || type;
    };

    const getStatusBadge = (status: string) => {
        const variants: Record<string, 'default' | 'secondary' | 'destructive'> = {
            completed: 'default',
            pending: 'secondary',
            failed: 'destructive',
        };
        return variants[status] || 'secondary';
    };

    if (transactions.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Historial de Transacciones</CardTitle>
                    <CardDescription>No hay transacciones registradas aún</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                        <div className="text-6xl">💸</div>
                        <p className="mt-4 text-muted-foreground">
                            Tus transacciones aparecerán aquí cuando comiences a recibir pagos
                        </p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Historial de Transacciones</CardTitle>
                <CardDescription>
                    Últimas {transactions.length} transacciones
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Tipo</TableHead>
                            <TableHead>Monto</TableHead>
                            <TableHead>Estado</TableHead>
                            <TableHead>Fecha</TableHead>
                            <TableHead className="text-right">ID Stripe</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {transactions.map((txn) => (
                            <TableRow key={txn.id}>
                                <TableCell className="font-medium">
                                    {getTxnTypeLabel(txn.txn_type)}
                                </TableCell>
                                <TableCell>
                                    <span
                                        className={
                                            txn.direction === 'in'
                                                ? 'text-green-600'
                                                : 'text-red-600'
                                        }
                                    >
                                        {txn.direction === 'in' ? '+' : '-'}
                                        {formatCurrency(txn.amount)}
                                    </span>
                                </TableCell>
                                <TableCell>
                                    <Badge variant={getStatusBadge(txn.status)}>
                                        {txn.status}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-sm text-muted-foreground">
                                    {formatDate(txn.created_at)}
                                </TableCell>
                                <TableCell className="text-right text-xs text-muted-foreground">
                                    {txn.txn_stripe_id ? (
                                        <code className="rounded bg-muted px-1 py-0.5">
                                            {txn.txn_stripe_id.slice(0, 20)}...
                                        </code>
                                    ) : (
                                        '-'
                                    )}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}
