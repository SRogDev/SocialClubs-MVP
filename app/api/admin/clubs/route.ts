import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit'
import { getAllClubsWithDetails } from '@/services/adminService'

/**
 * GET /api/admin/clubs
 * Obtiene todos los clubs con detalles completos
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

        // Obtener clubs
        const clubs = await getAllClubsWithDetails()

        return NextResponse.json({ data: clubs })
    } catch (error) {
        console.error('Error in admin clubs route:', error)
        return NextResponse.json(
            { error: 'Error interno del servidor' },
            { status: 500 }
        )
    }
}
