'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { setAgentConfig } from '@/services/agentService'
import { agentConfigSchema, type AgentConfig } from '@/schemas/agentSchema'

/**
 * Server Action para guardar configuración del agente
 */
export async function saveAgentConfigAction(clubId: string, config: AgentConfig) {
    try {
        // Validar datos con Zod
        const validatedConfig = agentConfigSchema.parse(config)

        // Verificar que el usuario es el creador del club
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return { success: false, error: 'No autenticado' }
        }

        const { data: club, error: clubError } = await supabase
            .from('clubs')
            .select('creator')
            .eq('id', clubId)
            .single()

        if (clubError || !club) {
            return { success: false, error: 'Club no encontrado' }
        }

        if (club.creator !== user.id) {
            return { success: false, error: 'No tienes permiso para editar este agente' }
        }

        // Guardar configuración
        const agent = await setAgentConfig(clubId, validatedConfig)

        // Revalidar rutas
        revalidatePath(`/panel/agent`)
        revalidatePath(`/clubs/${clubId}`)

        return { success: true, data: agent }
    } catch (error) {
        console.error('Error saving agent config:', error)
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Error desconocido',
        }
    }
}
