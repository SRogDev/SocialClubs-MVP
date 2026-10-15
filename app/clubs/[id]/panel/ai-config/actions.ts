'use server'

/**
 * Server actions for the AI config page (creator control center, Phases 41-45).
 *
 * Only club owners/admins may read or write `club_ai_config`. Writes go
 * through the service-role key; the page itself never exposes it.
 */

import { createClient as createServiceClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'

import { AI_STAFF_ENABLED, isEnabled } from '@/lib/ai/flags'
import { requireClubRole } from '@/lib/authz'
import { createClient } from '@/lib/supabase/server'

export interface AIConfigData {
    clubId: string
    proactivityLevel: 1 | 2 | 3
    enabledAgents: string[]
    tone: string
    policies: Record<string, unknown>
}

import { CONFIGURABLE_AGENTS } from './config'

function serviceRoleClient() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !serviceKey) {
        throw new Error('Supabase service-role no configurado')
    }
    return createServiceClient(url, serviceKey)
}

async function requireConfigAccess(clubId: string): Promise<void> {
    if (!isEnabled(AI_STAFF_ENABLED)) {
        throw new Error('El personal de IA está desactivado en este servidor')
    }
    const supabase = await createClient()
    const {
        data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
        throw new Error('Usuario no autenticado')
    }
    await requireClubRole(user.id, clubId, ['owner', 'admin'])
}

/** Load the club's AI config; defaults to L1 (draft-only) when never set. */
export async function getAIConfig(clubId: string): Promise<AIConfigData> {
    await requireConfigAccess(clubId)
    const svc = serviceRoleClient()
    const { data, error } = await svc
        .from('club_ai_config')
        .select('proactivity_level, enabled_agents, tone, policies')
        .eq('club_id', clubId)
        .maybeSingle()
    if (error) {
        throw new Error(`No se pudo cargar la configuración: ${error.message}`)
    }
    if (!data) {
        return {
            clubId,
            proactivityLevel: 1,
            enabledAgents: ['community-manager'],
            tone: 'friendly',
            policies: {},
        }
    }
    const level = Number(data.proactivity_level)
    if (level !== 1 && level !== 2 && level !== 3) {
        throw new Error(`Nivel de proactividad inválido en base de datos: ${level}`)
    }
    return {
        clubId,
        proactivityLevel: level,
        enabledAgents: Array.isArray(data.enabled_agents) ? data.enabled_agents : [],
        tone: typeof data.tone === 'string' ? data.tone : 'friendly',
        policies:
            data.policies && typeof data.policies === 'object'
                ? (data.policies as Record<string, unknown>)
                : {},
    }
}

/**
 * Save the club's proactivity level, per-agent toggles and tone.
 * The level is validated server-side: only 1, 2 or 3 are accepted.
 */
export async function saveAIConfig(
    clubId: string,
    formData: FormData
): Promise<{ success: boolean; error?: string }> {
    try {
        await requireConfigAccess(clubId)

        const level = Number(formData.get('proactivity_level'))
        if (level !== 1 && level !== 2 && level !== 3) {
            throw new Error('Nivel de proactividad inválido')
        }

        const enabledAgents: string[] = []
        for (const agentId of CONFIGURABLE_AGENTS) {
            if (formData.get(`agent_${agentId}`) === 'on') {
                enabledAgents.push(agentId)
            }
        }

        const tone = String(formData.get('tone') ?? 'friendly')
        if (!['friendly', 'formal', 'energetic'].includes(tone)) {
            throw new Error('Tono inválido')
        }

        const svc = serviceRoleClient()
        const { error } = await svc.from('club_ai_config').upsert(
            {
                club_id: clubId,
                proactivity_level: level,
                enabled_agents: enabledAgents,
                tone,
                updated_at: new Date().toISOString(),
            },
            { onConflict: 'club_id' }
        )
        if (error) {
            throw new Error(`No se pudo guardar: ${error.message}`)
        }

        revalidatePath(`/clubs/${clubId}/panel/ai-config`)
        return { success: true }
    } catch (err) {
        return {
            success: false,
            error: err instanceof Error ? err.message : 'Error al guardar',
        }
    }
}
