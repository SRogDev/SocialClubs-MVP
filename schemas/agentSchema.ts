/**
 * Agent configuration validation schemas
 */

import { z } from 'zod'

// Tone options for agent personality
export const toneOptions = ['didactico', 'entusiasta', 'reflexivo', 'sarcastico', 'alegre'] as const

// Personality schema
export const personalitySchema = z.object({
  role: z.string().min(1, 'El rol es requerido').max(200, 'El rol no puede superar 200 caracteres'),
  tone: z.enum(toneOptions, {
    errorMap: () => ({ message: 'Selecciona un tono válido' }),
  }),
  temperature: z.number().min(0, 'La temperatura debe ser mínimo 0').max(1, 'La temperatura debe ser máximo 1'),
})

// Context schema
export const contextSchema = z.object({
  baseKnowledge: z.string().max(1000, 'El conocimiento base no puede superar 1000 caracteres').optional(),
  boundaryRules: z.array(z.string()).max(5, 'Máximo 5 reglas de límites'),
})

// Single skill schema
export const skillSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido').max(100, 'El nombre no puede superar 100 caracteres'),
  action: z.string().min(1, 'La acción es requerida').max(500, 'La acción no puede superar 500 caracteres'),
  accessSubscriptionId: z.string().optional(),
})

// Skills array schema (max 4)
export const agentSkillsSchema = z.array(skillSchema).max(4, 'Máximo 4 servicios permitidos')

// Complete agent configuration schema
export const agentConfigSchema = z.object({
  personality: personalitySchema,
  context: contextSchema,
  skills: agentSkillsSchema,
})

// TypeScript types inferred from schemas
export type Personality = z.infer<typeof personalitySchema>
export type Context = z.infer<typeof contextSchema>
export type Skill = z.infer<typeof skillSchema>
export type AgentSkills = z.infer<typeof agentSkillsSchema>
export type AgentConfig = z.infer<typeof agentConfigSchema>
export type ToneOption = typeof toneOptions[number]
