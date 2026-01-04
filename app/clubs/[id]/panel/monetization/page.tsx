import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { EarningsOverview } from '@/components/monetization/EarningsOverview';
import { TransactionHistory } from '@/components/monetization/TransactionHistory';
import { RevenueMetrics } from '@/components/monetization/RevenueMetrics';
import { ConnectDashboardButton } from '@/components/monetization/ConnectDashboardButton';
import { Skeleton } from '@/components/ui/skeleton';
import { Card } from '@/components/ui/card';

interface MonetizationPageProps {
    params: { id: string };
    searchParams: { onboarding?: string };
}

/**
 * Página de Monetización (Server Component)
 * 
 * Dashboard completo para creators gestionar:
 * - Balance y earnings
 * - Cuenta Stripe Connect
 * - Transacciones históricas
 * - Métricas de ingresos (MRR, suscriptores)
 */
export default async function MonetizationPage({
    params,
    searchParams,
}: MonetizationPageProps) {
    const supabase = await createClient();

    // Verificar autenticación
    const {
        data: { user },
        error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
        redirect('/auth/login');
    }

    // Verificar ownership del club
    const { data: club, error: clubError } = await supabase
        .from('clubs')
        .select('id, name, user_id')
        .eq('id', params.id)
        .single();

    if (clubError || !club || club.user_id !== user.id) {
        redirect(`/clubs/${params.id}`);
    }

    // Obtener estado de cuenta Connect
    const { data: connectAccount } = await supabase
        .from('connected_stripe_accounts')
        .select('stripe_account_id, is_active')
        .eq('user_id', user.id)
        .maybeSingle();

    const hasConnectAccount = !!connectAccount?.stripe_account_id;
    const isConnectActive = connectAccount?.is_active || false;

    // Obtener balance
    const { data: balance } = await supabase
        .from('club_balances')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

    // Obtener transacciones recientes
    const { data: transactions } = await supabase
        .from('payments')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

    // Calcular métricas
    const { data: subscriptions } = await supabase
        .from('users_memberships')
        .select('membership:memberships(price)')
        .eq('status', 'active')
        .eq('memberships.club_id', params.id);

    const activeSubscribers = subscriptions?.length || 0;
    const mrr = subscriptions?.reduce((acc, sub: any) => {
        return acc + (sub.membership?.price || 0);
    }, 0) || 0;

    // Mensaje de onboarding completado
    const showOnboardingSuccess = searchParams.onboarding === 'success';

    return (
        <div className="space-y-6 p-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Monetización</h1>
                    <p className="text-muted-foreground">
                        Gestiona tus ingresos y configuración de pagos
                    </p>
                </div>

                <ConnectDashboardButton
                    hasAccount={hasConnectAccount}
                    isActive={isConnectActive}
                    showSuccess={showOnboardingSuccess}
                />
            </div>

            {/* Connect Status Alert */}
            {!hasConnectAccount && (
                <Card className="border-yellow-500 bg-yellow-50 p-4 dark:bg-yellow-950">
                    <div className="flex items-start gap-3">
                        <div className="text-yellow-600 dark:text-yellow-400">⚠️</div>
                        <div>
                            <h3 className="font-semibold text-yellow-900 dark:text-yellow-100">
                                Configura tu cuenta de pagos
                            </h3>
                            <p className="text-sm text-yellow-800 dark:text-yellow-200">
                                Para recibir pagos de suscripciones y videollamadas, debes conectar
                                tu cuenta de Stripe.
                            </p>
                        </div>
                    </div>
                </Card>
            )}

            {hasConnectAccount && !isConnectActive && (
                <Card className="border-orange-500 bg-orange-50 p-4 dark:bg-orange-950">
                    <div className="flex items-start gap-3">
                        <div className="text-orange-600 dark:text-orange-400">⏳</div>
                        <div>
                            <h3 className="font-semibold text-orange-900 dark:text-orange-100">
                                Completa tu configuración
                            </h3>
                            <p className="text-sm text-orange-800 dark:text-orange-200">
                                Tu cuenta de Stripe está en proceso de activación. Completa todos
                                los pasos requeridos.
                            </p>
                        </div>
                    </div>
                </Card>
            )}

            {/* Earnings Overview */}
            <Suspense fallback={<Skeleton className="h-32 w-full" />}>
                <EarningsOverview
                    totalEarnings={balance?.total_earnings || 0}
                    availableBalance={balance?.available_balance || 0}
                    isActive={isConnectActive}
                />
            </Suspense>

            {/* Revenue Metrics */}
            <Suspense fallback={<Skeleton className="h-48 w-full" />}>
                <RevenueMetrics
                    mrr={mrr}
                    activeSubscribers={activeSubscribers}
                    clubId={params.id}
                />
            </Suspense>

            {/* Transaction History */}
            <Suspense fallback={<Skeleton className="h-96 w-full" />}>
                <TransactionHistory transactions={transactions || []} />
            </Suspense>
        </div>
    );
}
