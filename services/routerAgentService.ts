export type ClubSpecialistAgent = 'analytics' | 'service' | 'engagement'

export interface AgentRoutingDecision {
    agent: ClubSpecialistAgent
    confidence: number
    reason: string
}

const ANALYTICS_KEYWORDS = [
    'analítica',
    'analitica',
    'métrica',
    'metrica',
    'kpi',
    'retención',
    'retencion',
    'crecimiento',
    'engagement rate',
    'conversion',
    'conversión',
    'funnel',
]

const SERVICE_KEYWORDS = [
    'configurar',
    'actualiza',
    'actualizar',
    'editar',
    'crear',
    'eliminar',
    'publicar',
    'canal',
    'membresía',
    'membresia',
    'widget',
    'agenda',
    'automatización',
    'automatizacion',
]

const ENGAGEMENT_KEYWORDS = [
    'contenido',
    'post',
    'campaña',
    'campana',
    'ideas',
    'dinámica',
    'dinamica',
    'activar comunidad',
    'interacción',
    'interaccion',
    'copy',
    'mensaje para miembros',
]

function countMatches(input: string, keywords: string[]): number {
    return keywords.reduce((acc, keyword) => acc + (input.includes(keyword) ? 1 : 0), 0)
}

export function routeClubPrompt(inputPrompt: string): AgentRoutingDecision {
    const prompt = inputPrompt.toLowerCase()

    const analyticsScore = countMatches(prompt, ANALYTICS_KEYWORDS)
    const serviceScore = countMatches(prompt, SERVICE_KEYWORDS)
    const engagementScore = countMatches(prompt, ENGAGEMENT_KEYWORDS)

    const scored = [
        { agent: 'analytics' as const, score: analyticsScore, reason: 'detected analytics intent' },
        { agent: 'service' as const, score: serviceScore, reason: 'detected operation/config intent' },
        { agent: 'engagement' as const, score: engagementScore, reason: 'detected community/content intent' },
    ].sort((a, b) => b.score - a.score)

    const winner = scored[0]

    if (winner.score <= 0) {
        return {
            agent: 'service',
            confidence: 0.35,
            reason: 'fallback to service agent for general request',
        }
    }

    const confidence = Math.min(0.95, 0.55 + winner.score * 0.1)

    return {
        agent: winner.agent,
        confidence,
        reason: winner.reason,
    }
}
