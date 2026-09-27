import { google } from '@ai-sdk/google'
import { streamText, tool, convertToModelMessages } from 'ai'
import type { NextRequest } from 'next/server'
import { z } from 'zod'

import { rateLimit } from '@/lib/rate-limit'
import { createClient } from '@/lib/supabase/server'
import { getAgentByClubId, getAgentSkills, saveAgentMessage } from '@/services/agentService'
import { runClubSqlTool, retrieveClubKnowledgeTool } from '@/services/agentToolsService'
import { buildAnalyticsAgentInstructions } from '@/services/analyticsAgentService'
import { buildEngagementAgentInstructions } from '@/services/engagementAgentService'
import { routeClubPrompt } from '@/services/routerAgentService'
import { buildServiceAgentInstructions } from '@/services/serviceAgentService'


export async function POST(request: NextRequest) {
    try {
        const limited = await rateLimit(request)
        if (limited) return limited

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
            .from('users_clubs')
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

        const latestUserMessage = [...messages].reverse().find((message) => message.role === 'user')
        const routing = routeClubPrompt(String(latestUserMessage?.content ?? ''))

        const specialistPrompt =
            routing.agent === 'analytics'
                ? buildAnalyticsAgentInstructions()
                : routing.agent === 'engagement'
                    ? buildEngagementAgentInstructions()
                    : buildServiceAgentInstructions()

        // Construir system prompt con contexto del club y skills
        let systemPrompt = agent.system_prompt || 'You are a helpful assistant.'
        systemPrompt += `\n\nMULTI-AGENT ROUTING:\n- Selected specialist: ${routing.agent}\n- Confidence: ${routing.confidence.toFixed(2)}\n- Reason: ${routing.reason}\n\n${specialistPrompt}`

        if (club) {
            systemPrompt += `\n\nCLUB CONTEXT (auto-injected):\n- Club name: ${club.name}\n- Description: ${club.bio || 'Sin descripción'}\n- Members: ${club.total_members ?? 0}\n- Level: ${club.level ?? 1}`
        }

        if (skills.length > 0) {
            systemPrompt += '\n\nYou have access to the following skills:\n'
            skills.forEach(skill => {
                systemPrompt += `- ${skill.name}: ${skill.action}\n`
            })
        }

        systemPrompt += '\n\nTOOLS:\n- Use `clubSqlTool` for controlled club/user preference queries.\n- Use `clubKnowledgeTool` for retrieving club RAG context when needed.'

        // Guardar mensaje del usuario
        const userMessage = messages[messages.length - 1]
        if (userMessage.role === 'user') {
            await saveAgentMessage(agent.id, 'user', { text: userMessage.content })
        }

        // Streaming con Gemini 2.5 Flash
        const result = streamText({
            model: google('gemini-2.0-flash-exp') as any,
            system: systemPrompt,
            messages: convertToModelMessages(messages),
            temperature: agent.temperature ?? 0.7,
            maxOutputTokens: 2000,
            tools: {
                clubSqlTool: tool({
                    description: 'Run controlled SQL-like queries for club profile, member summary, and user preference signals.',
                    inputSchema: z.object({
                        queryName: z.enum(['club_profile', 'club_member_summary', 'user_membership_preferences']),
                    }),
                    execute: async ({ queryName }) => {
                        return runClubSqlTool(queryName, {
                            clubId,
                            userId: user.id,
                        })
                    },
                }),
                clubKnowledgeTool: tool({
                    description: 'Retrieve relevant club knowledge chunks from the RAG service.',
                    inputSchema: z.object({
                        query: z.string().min(2),
                    }),
                    execute: async ({ query }) => {
                        return retrieveClubKnowledgeTool(clubId, query)
                    },
                }),
            },
            onFinish: async ({ text }) => {
                // Guardar respuesta del asistente
                await saveAgentMessage(agent.id, 'assistant', { text })
            },
        })

        return result.toUIMessageStreamResponse()
    } catch (error) {
        console.error('Error in agent chat:', error)
        return new Response('Internal Server Error', { status: 500 })
    }
}
