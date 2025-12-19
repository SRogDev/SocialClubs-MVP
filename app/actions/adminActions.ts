'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { banClub, exportMetricsCSV } from '@/services/adminService'

/**
 * Server Action para banear un club
 * Requiere rol de admin
 */
export async function banClubAction(clubId: string) {
    const supabase = await createClient()

    // Verificar autenticación
    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        return { error: 'No autenticado' }
    }

    // Verificar rol de admin
    const { data: userData } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single()

    if (userData?.role !== 'admin') {
        return { error: 'No tienes permisos de administrador' }
    }

    try {
        // Banear el club
        await banClub(clubId, user.id)

        // Enviar email de notificación al creator
        try {
            const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
            await fetch(`${baseUrl}/api/resend/ban-club`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ clubId }),
            })
        } catch (emailError) {
            console.error('Error sending ban email:', emailError)
            // No fallar la acción si el email falla
        }

        // Revalidar paths
        revalidatePath('/admin/moderation')
        revalidatePath('/admin/club-gestion')
        revalidatePath(`/clubs/${clubId}`)

        return { success: true }
    } catch (error) {
        console.error('Error in banClubAction:', error)
        return { error: 'Error al banear el club' }
    }
}

/**
 * Server Action para enviar advertencia a un creator
 * Requiere rol de admin
 * TODO: Implementar lógica completa de advertencias
 */
export async function warnCreatorAction(clubId: string, warningReason?: string) {
    const supabase = await createClient()

    // Verificar autenticación
    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        return { error: 'No autenticado' }
    }

    // Verificar rol de admin
    const { data: userData } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single()

    if (userData?.role !== 'admin') {
        return { error: 'No tienes permisos de administrador' }
    }

    try {
        // Enviar email de advertencia
        const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
        await fetch(`${baseUrl}/api/resend/warning-club`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ clubId, warningReason }),
        })

        // TODO: Registrar la advertencia en la base de datos
        // TODO: Incrementar contador de advertencias del club
        // TODO: Si tiene 3 advertencias, considerar suspensión automática

        return { success: true }
    } catch (error) {
        console.error('Error in warnCreatorAction:', error)
        return { error: 'Error al enviar advertencia' }
    }
}

/**
 * Server Action para exportar métricas a CSV
 * Requiere rol de admin
 */
export async function exportMetricsAction() {
    const supabase = await createClient()

    // Verificar autenticación
    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        return { error: 'No autenticado' }
    }

    // Verificar rol de admin
    const { data: userData } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single()

    if (userData?.role !== 'admin') {
        return { error: 'No tienes permisos de administrador' }
    }

    try {
        const csvData = await exportMetricsCSV()
        return { success: true, data: csvData }
    } catch (error) {
        console.error('Error in exportMetricsAction:', error)
        return { error: 'Error al exportar métricas' }
    }
}

/**
 * Server Action para enviar email masivo de marketing a todos los creadores
 * Requiere rol de admin
 * TODO: Implementar con sistema de colas para envíos masivos
 */
export async function sendMarketingEmailAction(message: string, subject: string) {
    const supabase = await createClient()

    // Verificar autenticación
    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        return { error: 'No autenticado' }
    }

    // Verificar rol de admin
    const { data: userData } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single()

    if (userData?.role !== 'admin') {
        return { error: 'No tienes permisos de administrador' }
    }

    // TODO: Implementar sistema de envío masivo de emails
    // - Obtener lista de todos los creadores
    // - Usar sistema de colas (Bull, BullMQ, etc.)
    // - Enviar emails en lotes para evitar rate limits
    // - Tracking de envíos (entregados, abiertos, clicks)

    console.log('📧 MOCKUP: Enviando email masivo a creadores')
    console.log('Subject:', subject)
    console.log('Message:', message)

    return { success: true, message: 'Email marketing programado (mockup)' }
}
