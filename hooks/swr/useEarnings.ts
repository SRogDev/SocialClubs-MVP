import useSWR from 'swr';
import { ClubBalance, Payment } from '@/types/database';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface EarningsData {
    success: boolean;
    balance: ClubBalance | null;
    transactions: Payment[];
    stripeBalance: {
        available: Array<{ amount: number; currency: string }>;
        pending: Array<{ amount: number; currency: string }>;
    } | null;
}

/**
 * useEarnings Hook
 * 
 * Fetches creator earnings, balance, and transaction history.
 * Includes data from both Supabase and Stripe.
 * 
 * @returns SWR response with earnings data
 * 
 * @example
 * const { earnings, isLoading } = useEarnings();
 * 
 * console.log(earnings.balance.total_earnings);
 * console.log(earnings.balance.available_balance);
 * console.log(earnings.transactions);
 */
export function useEarnings() {
    const { data, error, isLoading, mutate } = useSWR<EarningsData>(
        '/api/stripe/earnings',
        fetcher,
        {
            revalidateOnFocus: true,
            refreshInterval: 60000, // Refresh cada 1 minuto
        }
    );

    return {
        earnings: data
            ? {
                balance: data.balance || { total_earnings: 0, available_balance: 0 },
                transactions: data.transactions || [],
                stripeBalance: data.stripeBalance,
            }
            : null,
        isLoading,
        isError: error,
        mutate,
    };
}

/**
 * useConnectStatus Hook
 * 
 * Fetches Stripe Connect account status.
 * Used for onboarding flow and dashboard.
 * 
 * @returns SWR response with Connect status
 * 
 * @example
 * const { status, isLoading } = useConnectStatus();
 * 
 * if (status.hasAccount && status.isActive) {
 *   // Show earnings dashboard
 * } else {
 *   // Show onboarding prompt
 * }
 */
export function useConnectStatus() {
    const { data, error, isLoading, mutate } = useSWR<{
        hasAccount: boolean;
        isActive: boolean;
        chargesEnabled?: boolean;
        payoutsEnabled?: boolean;
        detailsSubmitted?: boolean;
    }>('/api/stripe/connect/status', fetcher, {
        revalidateOnFocus: true,
        dedupingInterval: 30000, // 30 segundos
    });

    return {
        status: data || {
            hasAccount: false,
            isActive: false,
        },
        isLoading,
        isError: error,
        mutate,
    };
}
