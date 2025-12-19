import useSWR from 'swr'
import useSWRSubscription, { SWRSubscriptionOptions } from 'swr/subscription'
import type {
    PlatformMetrics,
    ClubWithDetails,
    ClubWithReports,
    MarketingStats,
} from '@/services/adminService'

// Fetcher genérico
const fetcher = (url: string) => fetch(url).then((res) => res.json())

/**
 * Hook SWR con Server-Sent Events para métricas en tiempo real
 * Incluye auto-reconnect automático
 */
export function useAdminMetrics() {
    const { data, error } = useSWRSubscription<
        { data: PlatformMetrics },
        Error,
        string
    >(
        '/api/admin/metrics/stream',
        (key, { next }: SWRSubscriptionOptions<{ data: PlatformMetrics }, Error>) => {
            const eventSource = new EventSource(key)

            eventSource.onmessage = (event) => {
                try {
                    const metrics = JSON.parse(event.data)
                    next(null, { data: metrics })
                } catch (err) {
                    next(err as Error)
                }
            }

            eventSource.onerror = (err) => {
                console.error('SSE Error:', err)
                eventSource.close()
                // SWR automáticamente reintentará la conexión
            }

            // Cleanup function
            return () => {
                eventSource.close()
            }
        }
    )

    return {
        metrics: data?.data,
        isLoading: !error && !data,
        isError: error,
    }
}

/**
 * Hook SWR para obtener todos los clubs con detalles
 */
export function useAdminClubs() {
    const { data, error, mutate } = useSWR<{ data: ClubWithDetails[] }>(
        '/api/admin/clubs',
        fetcher,
        {
            revalidateOnFocus: false,
            revalidateOnReconnect: true,
        }
    )

    return {
        clubs: data?.data,
        isLoading: !error && !data,
        isError: error,
        mutate,
    }
}

/**
 * Hook SWR para obtener clubs con reportes pendientes
 */
export function useClubsWithReports() {
    const { data, error, mutate } = useSWR<{ data: ClubWithReports[] }>(
        '/api/admin/reports',
        fetcher,
        {
            refreshInterval: 60000, // Revalidar cada minuto
            revalidateOnFocus: true,
        }
    )

    return {
        clubsWithReports: data?.data,
        isLoading: !error && !data,
        isError: error,
        mutate,
    }
}

/**
 * Hook SWR para estadísticas de marketing
 * ⚠️ PENDIENTE: Requiere implementar GET /api/admin/marketing/stats
 * Service existe: getMarketingStats() en adminService
 */
export function useMarketingStats() {
    const { data, error } = useSWR<{ data: MarketingStats }>(
        '/api/admin/marketing/stats',
        fetcher,
        {
            revalidateOnFocus: false,
            revalidateOnReconnect: false,
        }
    )

    return {
        stats: data?.data,
        isLoading: !error && !data,
        isError: error,
    }
}
