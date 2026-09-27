import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server'

import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit'
import { createClient } from '@/lib/supabase/server'
import { getClubsWithReports } from '@/services/adminService'

/**
 * GET /api/admin/reports
 * Obtiene clubs con reportes pendientes
 * Solo accesible por admins
 */
export async function GET(request: NextRequest) {
    try {
        // Rate limiting
        const rateLimitResult = await rateLimit(request, RATE_LIMITS.QUERY)
        if (rateLimitResult) return rateLimitResult

        // Verificar autenticación y rol de admin
        const supabase = await createClient()
        const {
            data: { user },
            error: authError,
        } = await supabase.auth.getUser()

        if (authError || !user) {
            return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
        }

        // Verificar que el usuario es admin
        const { data: userData, error: userError } = await supabase
            .from('users')
            .select('role')
            .eq('id', user.id)
            .single()

        if (userError || userData?.role !== 'admin') {
            return NextResponse.json(
                { error: 'No tienes permisos de administrador' },
                { status: 403 }
            )
        }

        // Obtener clubs con reportes
        const clubsWithReports = await getClubsWithReports()

        return NextResponse.json({ data: clubsWithReports })
    } catch (error) {
        console.error('Error in admin reports route:', error)
        return NextResponse.json(
            { error: 'Error interno del servidor' },
            { status: 500 }
        )
    }
}
