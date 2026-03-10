import { createClient } from '@/lib/supabase/server'
import { getAgentByClubId, getAgentSkills, saveAgentMessage } from '@/services/agentService'
import { streamText } from 'ai'
import { google } from '@ai-sdk/google'
import { rateLimit } from '@/lib/rate-limit'

const limiter = rateLimit({
    interval: 60 * 1000, // 1 minute
    uniqueTokenPerInterval: 500,
})

export const runtime = 'edge'

export async function POST(request: Request) {
    try {
        // Rate limiting
        const ip = request.headers.get('x-forwarded-for') || 'anonymous'
        try {
            await limiter.check(10, ip) // 10 requests per minute
        } catch {
            return new Response('Rate limit exceeded', { status: 429 })
        }

        // Autenticación
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return new Response('Unauthorized', { status: 401 })
        }

        const body = await request.json()
        const { messages, clubId } = body

        if (!clubId || !messages) {
            return new Response('Missing required fields', { status: 400 })
        }

        // Verificar que el usuario es miembro del club
        const { data: membership } = await supabase
            .from('memberships')
            .select('*')
            .eq('club_id', clubId)
            .eq('user_id', user.id)
            .single()

        if (!membership) {
            return new Response('Not a member of this club', { status: 403 })
        }

        // Obtener agente del club
        const agent = await getAgentByClubId(clubId)

        if (!agent) {
            return new Response('Agent not found for this club', { status: 404 })
        }

        // Obtener skills del agente
        const skills = await getAgentSkills(agent.id)

        // Fetch club context for grounded answers
        const { data: club } = await supabase
            .from('clubs')
            .select('name, bio, total_members, level')
            .eq('id', clubId)
            .single()

        // Construir system prompt con contexto del club y skills
        let systemPrompt = agent.system_prompt || 'You are a helpful assistant.'

        if (club) {
            systemPrompt += `\n\nCLUB CONTEXT (auto-injected):\n- Club name: ${club.name}\n- Description: ${club.bio || 'Sin descripción'}\n- Members: ${club.total_members ?? 0}\n- Level: ${club.level ?? 1}`
        }

        if (skills.length > 0) {
            systemPrompt += '\n\nYou have access to the following skills:\n'
            skills.forEach(skill => {
                systemPrompt += `- ${skill.name}: ${skill.action}\n`
            })
        }

        // Guardar mensaje del usuario
        const userMessage = messages[messages.length - 1]
        if (userMessage.role === 'user') {
            await saveAgentMessage(agent.id, 'user', { text: userMessage.content })
        }

        // Streaming con Gemini 2.5 Flash
        const result = streamText({
            model: google('gemini-2.0-flash-exp'),
            system: systemPrompt,
            messages,
            temperature: agent.temperature,
            maxTokens: 2000,
            onFinish: async ({ text }) => {
                // Guardar respuesta del asistente
                await saveAgentMessage(agent.id, 'assistant', { text })
            },
        })

        return result.toDataStreamResponse()
    } catch (error) {
        console.error('Error in agent chat:', error)
        return new Response('Internal Server Error', { status: 500 })
    }
}
