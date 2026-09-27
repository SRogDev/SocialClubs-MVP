'use server'

import { revalidatePath } from 'next/cache'

import { createClient } from '@/lib/supabase/server'
import { agentConfigSchema, type AgentConfig } from '@/schemas/agentSchema'
import { setAgentConfig, getAgentByClubId, getAgentSkills } from '@/services/agentService'

/**
 * Fetch agent metadata (name + skills) for MainChat
 */
export async function getAgentMetaAction(clubId: string): Promise<{
    agentName: string
    skills: { name: string; action: string }[]
} | null> {
    try {
        const supabase = await createClient()
        const [{ data: club }, agent] = await Promise.all([
            supabase.from('clubs').select('name').eq('id', clubId).single(),
            getAgentByClubId(clubId),
        ])

        const clubName = club?.name ?? 'Agente del club'
        if (!agent) return { agentName: clubName, skills: [] }

        const skills = await getAgentSkills(agent.id)
        return {
            agentName: clubName,
            skills: skills.map((s) => ({ name: s.name, action: s.action })),
        }
    } catch {
        return null
    }
}

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
