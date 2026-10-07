import { createClient } from '@/lib/supabase/server'

/**
 * Admin Service - Repository Pattern
 * Contiene TODAS las operaciones CRUD relacionadas con administración de la plataforma
 */

// Tipos base
export interface Club {
    id: string
    name: string
    logo: Record<string, any> | null
    bio: string | null
    level: number | null
    total_members: number
    status: 'active' | 'banned' | 'suspended'
    created_at: string
    creator: string
}

export interface User {
    id: string
    name: string | null
    username: string | null
    avatar_url: string | null
}
export interface PlatformMetrics {
    mau: number // Monthly Active Users
    dau: number // Daily Active Users
    totalClubs: number
    activeSubscriptions: number
    monthlyRevenue: number // en centavos
    avgSessionLength: number // en segundos
    retentionRate: number // porcentaje
    postsToday: number
    newSignups: number
}

export interface ClubWithDetails {
    id: string
    name: string
    logo: Record<string, any> | null
    bio: string | null
    level: number | null
    total_members: number
    status: 'active' | 'banned' | 'suspended'
    created_at: string
    creator: User
    stats: {
        engagement: number
        revenue: number
        superlikes: number
    }
}

export interface ClubWithReports extends ClubWithDetails {
    reports: {
        total: number
        sexual_content: number
        extreme_violence: number
        scam: number
        spam: number
    }
}

export interface MarketingStats {
    total_emails_sent: number
    email_growth: number // porcentaje de crecimiento
    email_open_rate: number // porcentaje
    email_click_rate: number // porcentaje
    marketing_conversion: number // porcentaje
    campaign_revenue: number // en centavos
    active_users: number
    creatorConversionRate: number // porcentaje
    avgRevenuePerCreator: number // en centavos
    topClubCategory: string
    referralSuccessRate: number // porcentaje
    campaignROI: number // porcentaje
}

/**
 * Obtiene métricas principales de la plataforma (snapshot actual)
 */
export async function getPlatformMetrics(): Promise<PlatformMetrics> {
    const supabase = await createClient()
    const now = new Date()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    const today = new Date(now.setHours(0, 0, 0, 0))

    try {
        // MAU - usuarios activos en los últimos 30 días
        const { count: mau } = await supabase
            .from('users')
            .select('*', { count: 'exact', head: true })
            .gte('created_at', thirtyDaysAgo.toISOString())

        // DAU - usuarios activos hoy (aproximado por posts/comments hoy)
        const { data: activeToday } = await supabase
            .from('posts')
            .select('user_id')
            .gte('created_at', today.toISOString())

        const uniqueActiveToday = new Set(activeToday?.map(p => p.user_id) || [])

        // Total clubs activos
        const { count: totalClubs } = await supabase
            .from('clubs')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'active')

        // Subscripciones activas
        const { count: activeSubscriptions } = await supabase
            .from('users_memberships')
            .select('*', { count: 'exact', head: true })
            .eq('is_active', true)

        // Revenue del mes actual
        const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
        const { data: payments } = await supabase
            .from('payments')
            .select('amount')
            .eq('status', 'completed')
            .eq('type', 'payment')
            .gte('created_at', firstDayOfMonth.toISOString())

        const monthlyRevenue = payments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0

        // Avg session length (mockeado por ahora - requeriría tracking de sesiones)
        const avgSessionLength = 420 // 7 minutos en segundos

        // Retention rate 30d (usuarios que volvieron después de 30 días)
        const { count: totalUsersThirtyDaysAgo } = await supabase
            .from('users')
            .select('*', { count: 'exact', head: true })
            .lte('created_at', thirtyDaysAgo.toISOString())

        const retentionRate = totalUsersThirtyDaysAgo
            ? ((mau || 0) / totalUsersThirtyDaysAgo) * 100
            : 0

        // Posts de hoy
        const { count: postsToday } = await supabase
            .from('posts')
            .select('*', { count: 'exact', head: true })
            .gte('created_at', today.toISOString())

        // Nuevos signups hoy
        const { count: newSignups } = await supabase
            .from('users')
            .select('*', { count: 'exact', head: true })
            .gte('created_at', today.toISOString())

        return {
            mau: mau || 0,
            dau: uniqueActiveToday.size,
            totalClubs: totalClubs || 0,
            activeSubscriptions: activeSubscriptions || 0,
            monthlyRevenue,
            avgSessionLength,
            retentionRate: Math.round(retentionRate * 100) / 100,
            postsToday: postsToday || 0,
            newSignups: newSignups || 0,
        }
    } catch (error) {
        console.error('Error fetching platform metrics:', error)
        throw error
    }
}

/**
 * Obtiene todos los clubs con detalles completos (para Club Gestión)
 */
export async function getAllClubsWithDetails(): Promise<ClubWithDetails[]> {
    const supabase = await createClient()

    try {
        const { data: clubs, error } = await supabase
            .from('clubs')
            .select(`
        id,
        name,
        logo,
        bio,
        level,
        total_members,
        status,
        created_at,
        creator:users!clubs_creator_fkey (
          id,
          name,
          username,
          avatar_url
        )
      `)
            .order('created_at', { ascending: false })

        if (error) throw error

        // Obtener stats de cada club
        const clubIds = clubs?.map(c => c.id) || []
        const { data: stats } = await supabase
            .from('clubStats')
            .select('club, engagement, revenue, superlikes')
            .in('club', clubIds)

        const statsMap = new Map(stats?.map(s => [s.club, s]) || [])

        return clubs?.map(club => ({
            ...club,
            creator: Array.isArray(club.creator) ? club.creator[0] : club.creator,
            stats: statsMap.get(club.id) || {
                engagement: 0,
                revenue: 0,
                superlikes: 0,
            },
        })) || []
    } catch (error) {
        console.error('Error fetching clubs with details:', error)
        throw error
    }
}

/**
 * Obtiene clubs con al menos 1 reporte, ordenados por cantidad de reportes (mayor a menor)
 */
export async function getClubsWithReports(): Promise<ClubWithReports[]> {
    const supabase = await createClient()

    try {
        // Obtener clubs con reportes agrupados
        const { data: reportsData, error: reportsError } = await supabase
            .from('club_reports')
            .select('club_id, type')
            .eq('status', 'pending')

        if (reportsError) throw reportsError

        // Agrupar reportes por club y tipo
        const clubReportsMap = new Map<string, {
            total: number
            sexual_content: number
            extreme_violence: number
            scam: number
            spam: number
        }>()

        reportsData?.forEach(report => {
            if (!clubReportsMap.has(report.club_id)) {
                clubReportsMap.set(report.club_id, {
                    total: 0,
                    sexual_content: 0,
                    extreme_violence: 0,
                    scam: 0,
                    spam: 0,
                })
            }
            const counts = clubReportsMap.get(report.club_id)!
            counts.total++
            counts[report.type as keyof typeof counts]++
        })

        // Obtener detalles de los clubs con reportes
        const clubIds = Array.from(clubReportsMap.keys())
        if (clubIds.length === 0) return []

        const { data: clubs, error: clubsError } = await supabase
            .from('clubs')
            .select(`
        id,
        name,
        logo,
        bio,
        level,
        total_members,
        status,
        created_at,
        creator:users!clubs_creator_fkey (
          id,
          name,
          username,
          avatar_url
        )
      `)
            .in('id', clubIds)

        if (clubsError) throw clubsError

        // Obtener stats
        const { data: stats } = await supabase
            .from('clubStats')
            .select('club, engagement, revenue, superlikes')
            .in('club', clubIds)

        const statsMap = new Map(stats?.map(s => [s.club, s]) || [])

        // Combinar datos y ordenar por cantidad de reportes
        const clubsWithReports: ClubWithReports[] = clubs?.map(club => ({
            ...club,
            creator: Array.isArray(club.creator) ? club.creator[0] : club.creator,
            stats: statsMap.get(club.id) || {
                engagement: 0,
                revenue: 0,
                superlikes: 0,
            },
            reports: clubReportsMap.get(club.id) || {
                total: 0,
                sexual_content: 0,
                extreme_violence: 0,
                scam: 0,
                spam: 0,
            },
        })) || []

        // Ordenar por total de reportes (mayor a menor)
        return clubsWithReports.sort((a, b) => b.reports.total - a.reports.total)
    } catch (error) {
        console.error('Error fetching clubs with reports:', error)
        throw error
    }
}

/**
 * Banear un club (cambiar status a 'banned')
 */
export async function banClub(clubId: string, adminId: string): Promise<void> {
    const supabase = await createClient()

    try {
        const { error } = await supabase
            .from('clubs')
            .update({ status: 'banned' })
            .eq('id', clubId)

        if (error) throw error

        // TODO: Registrar acción en tabla admin_actions cuando se implemente
        console.log(`Club ${clubId} banned by admin ${adminId}`)
    } catch (error) {
        console.error('Error banning club:', error)
        throw error
    }
}

/**
 * Obtener información del creador de un club (para enviar emails)
 */
export async function getClubCreatorEmail(clubId: string): Promise<{ email: string; name: string; clubName: string } | null> {
    const supabase = await createClient()

    try {
        const { data: club, error: clubError } = await supabase
            .from('clubs')
            .select('name, creator')
            .eq('id', clubId)
            .single()

        if (clubError || !club) throw clubError

        // Obtener email del auth
        const { data: { user }, error: userError } = await supabase.auth.admin.getUserById(club.creator)

        if (userError || !user?.email) {
            console.error('Error fetching user email:', userError)
            return null
        }

        // Obtener nombre del usuario
        const { data: userData } = await supabase
            .from('users')
            .select('name')
            .eq('id', club.creator)
            .single()

        return {
            email: user.email,
            name: userData?.name || 'Usuario',
            clubName: club.name,
        }
    } catch (error) {
        console.error('Error fetching club creator email:', error)
        return null
    }
}

/**
 * Obtiene estadísticas de marketing
 */
export async function getMarketingStats(): Promise<MarketingStats> {
    const supabase = await createClient()

    try {
        // Total de usuarios
        const { count: totalUsers } = await supabase
            .from('users')
            .select('*', { count: 'exact', head: true })

        // Total de creadores (usuarios que tienen al menos un club)
        const { data: creators } = await supabase
            .from('clubs')
            .select('creator')

        const uniqueCreators = new Set(creators?.map(c => c.creator) || [])
        const creatorConversionRate = totalUsers
            ? (uniqueCreators.size / totalUsers) * 100
            : 0

        // Revenue promedio por creador
        const { data: clubRevenues } = await supabase
            .from('clubStats')
            .select('revenue')

        const totalRevenue = clubRevenues?.reduce((sum, s) => sum + (s.revenue || 0), 0) || 0
        const avgRevenuePerCreator = uniqueCreators.size > 0
            ? totalRevenue / uniqueCreators.size
            : 0

        // Top categoría de club (basado en tags más comunes)
        const { data: clubs } = await supabase
            .from('clubs')
            .select('tags')
            .eq('status', 'active')

        const tagCounts = new Map<string, number>()
        clubs?.forEach(club => {
            const tags = Array.isArray(club.tags) ? club.tags : []
            tags.forEach((tag: string) => {
                tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1)
            })
        })

        const topCategory = Array.from(tagCounts.entries())
            .sort((a, b) => b[1] - a[1])[0]?.[0] || 'General'

        // Referral success rate
        const { count: totalReferrals } = await supabase
            .from('referrals')
            .select('*', { count: 'exact', head: true })

        const { count: successfulReferrals } = await supabase
            .from('referrals')
            .select('*', { count: 'exact', head: true })
            .not('referred_user', 'is', null)

        const referralSuccessRate = totalReferrals
            ? ((successfulReferrals || 0) / totalReferrals) * 100
            : 0

        return {
            total_emails_sent: 1250, // Mockeado - requeriría integración con Resend
            email_growth: 15.3, // Mockeado - crecimiento mensual
            email_open_rate: 45.5, // Mockeado - requeriría integración con Resend analytics
            email_click_rate: 8.2, // Mockeado - requeriría integración con Resend analytics
            marketing_conversion: 12.4, // Mockeado - porcentaje de conversiones
            campaign_revenue: 45000, // Mockeado - revenue en centavos
            active_users: totalUsers || 0,
            creatorConversionRate: Math.round(creatorConversionRate * 100) / 100,
            avgRevenuePerCreator: Math.round(avgRevenuePerCreator),
            topClubCategory: topCategory,
            referralSuccessRate: Math.round(referralSuccessRate * 100) / 100,
            campaignROI: 312, // Mockeado - requeriría tracking de campañas
        }
    } catch (error) {
        console.error('Error fetching marketing stats:', error)
        throw error
    }
}

/**
 * Exporta métricas de la plataforma a formato CSV
 */
export async function exportMetricsCSV(): Promise<string> {
    const metrics = await getPlatformMetrics()
    const timestamp = new Date().toISOString()

    const csvHeader = 'Métrica,Valor,Timestamp\n'
    const csvRows = [
        `MAU (Monthly Active Users),${metrics.mau},${timestamp}`,
        `DAU (Daily Active Users),${metrics.dau},${timestamp}`,
        `Total Clubs Activos,${metrics.totalClubs},${timestamp}`,
        `Subscripciones Activas,${metrics.activeSubscriptions},${timestamp}`,
        `Revenue Mensual (centavos),${metrics.monthlyRevenue},${timestamp}`,
        `Avg Session Length (segundos),${metrics.avgSessionLength},${timestamp}`,
        `Retention Rate 30d (%),${metrics.retentionRate},${timestamp}`,
        `Posts Hoy,${metrics.postsToday},${timestamp}`,
        `Nuevos Signups Hoy,${metrics.newSignups},${timestamp}`,
    ].join('\n')

    return csvHeader + csvRows
}

/**
 * Admin Service Object - Repository Pattern
 * Agrupa todas las funciones de administración para facilitar imports
 */
export const adminService = {
    getPlatformMetrics,
    getAllClubsWithDetails,
    getClubsWithReports,
    banClub,
    getClubCreatorEmail,
    getMarketingStats,
    exportMetricsCSV,
    getRevenueSeries,
    getUserGrowthSeries,
    getTopClubsByEngagement,
}

export interface RevenuePoint {
    date: string
    revenue: number
}

export interface GrowthPoint {
    date: string
    users: number
}

export interface TopClubPoint {
    name: string
    engagement: number
}

const fmtDay = (d: Date) =>
    d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })

/**
 * Revenue per day for the last `days` days, from completed payments.
 * Returns an honest (possibly empty) series — no mock data.
 */
export async function getRevenueSeries(days = 30): Promise<RevenuePoint[]> {
    const supabase = await createClient()
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

    const { data, error } = await supabase
        .from('payments')
        .select('amount, created_at')
        .eq('status', 'completed')
        .gte('created_at', since.toISOString())

    if (error) {
        console.error('Error fetching revenue series:', error)
        throw error
    }

    const buckets = new Map<string, number>()
    for (let i = 0; i < days; i++) {
        const d = new Date(Date.now() - (days - 1 - i) * 24 * 60 * 60 * 1000)
        buckets.set(d.toISOString().slice(0, 10), 0)
    }
    for (const p of data || []) {
        const key = new Date(p.created_at as string).toISOString().slice(0, 10)
        if (buckets.has(key)) {
            // amount is stored in cents — chart shows dollars
            buckets.set(key, (buckets.get(key) || 0) + (p.amount || 0) / 100)
        }
    }
    return [...buckets.entries()].map(([iso, revenue]) => ({
        date: fmtDay(new Date(iso + 'T00:00:00')),
        revenue: Math.round(revenue * 100) / 100,
    }))
}

/**
 * Cumulative user count per day for the last `days` days.
 * Returns an honest (possibly empty) series — no mock data.
 */
export async function getUserGrowthSeries(days = 30): Promise<GrowthPoint[]> {
    const supabase = await createClient()
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

    const { count: base, error: baseError } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .lt('created_at', since.toISOString())

    if (baseError) {
        console.error('Error fetching user base count:', baseError)
        throw baseError
    }

    const { data, error } = await supabase
        .from('users')
        .select('created_at')
        .gte('created_at', since.toISOString())

    if (error) {
        console.error('Error fetching user growth series:', error)
        throw error
    }

    const perDay = new Map<string, number>()
    for (const u of data || []) {
        const key = new Date(u.created_at as string).toISOString().slice(0, 10)
        perDay.set(key, (perDay.get(key) || 0) + 1)
    }

    let cumulative = base || 0
    return Array.from({ length: days }, (_, i) => {
        const d = new Date(Date.now() - (days - 1 - i) * 24 * 60 * 60 * 1000)
        const key = d.toISOString().slice(0, 10)
        cumulative += perDay.get(key) || 0
        return { date: fmtDay(d), users: cumulative }
    })
}

/**
 * Top clubs by member count. `engagement` is the member total — a real,
 * explainable metric, not a fabricated score.
 */
export async function getTopClubsByEngagement(limit = 5): Promise<TopClubPoint[]> {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('clubs')
        .select('name, total_members')
        .order('total_members', { ascending: false })
        .limit(limit)

    if (error) {
        console.error('Error fetching top clubs:', error)
        throw error
    }

    return (data || []).map((c) => ({
        name: c.name || 'Sin nombre',
        engagement: c.total_members || 0,
    }))
}
