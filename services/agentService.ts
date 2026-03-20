/**
 * Agent Service - Repository pattern for agent CRUD operations
 */

import { createClient } from '@/lib/supabase/server'
import type { AgentConfig, Skill } from '@/schemas/agentSchema'

// Types
export interface Agent {
  id: string
  club_id: string
  system_prompt: string | null
  base_context: string | null
  temperature: number | null
  created_at: string
  updated_at: string
}

export interface AgentSkill {
  id: string
  agent_id: string
  name: string
  action: string
  access_subscription_id: string | null
  created_at: string
  updated_at: string
}

export interface AgentMessage {
  id: string
  agent_id: string
  role: 'user' | 'assistant' | 'system' | 'tool'
  content: Record<string, unknown>
  tool_used: string | null
  created_at: string
}

/**
 * Get agent by club ID
 */
export async function getAgentByClubId(clubId: string): Promise<Agent | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('club_agents')
    .select('*')
    .eq('club_id', clubId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      // No rows returned
      return null
    }
    throw new Error(`Failed to get agent: ${error.message}`)
  }

  return data
}

/**
 * Generate system prompt from config
 */
function generateSystemPrompt(config: AgentConfig): string {
  const { personality, context } = config

  let prompt = `You are ${personality.role}. Your tone is ${personality.tone}.\n\n`

  if (context.baseKnowledge) {
    prompt += `Base Knowledge: ${context.baseKnowledge}\n\n`
  }

  if (context.boundaryRules.length > 0) {
    prompt += 'Boundary Rules:\n'
    context.boundaryRules.forEach(rule => {
      prompt += `- ${rule}\n`
    })
  }

  return prompt.trim()
}

/**
 * Set agent configuration (create or update)
 */
export async function setAgentConfig(clubId: string, config: AgentConfig): Promise<Agent> {
  const supabase = await createClient()

  // Generate system prompt from config
  const systemPrompt = generateSystemPrompt(config)

  // Check if agent already exists
  const existingAgent = await getAgentByClubId(clubId)

  let agent: Agent

  if (existingAgent) {
    // Update existing agent
    const { data, error } = await supabase
      .from('club_agents')
      .update({
        system_prompt: systemPrompt,
        temperature: config.personality.temperature,
        base_context: null, // As requested, leave null for now
        updated_at: new Date().toISOString(),
      })
      .eq('id', existingAgent.id)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to update agent: ${error.message}`)
    }

    agent = data
  } else {
    // Create new agent
    const { data, error } = await supabase
      .from('club_agents')
      .insert({
        club_id: clubId,
        system_prompt: systemPrompt,
        temperature: config.personality.temperature,
        base_context: null, // As requested, leave null for now
      })
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to create agent: ${error.message}`)
    }

    agent = data
  }

  // Handle skills (create/update/delete as needed)
  await syncAgentSkills(agent.id, config.skills)

  return agent
}

/**
 * Sync agent skills (create new, update existing, delete removed)
 */
async function syncAgentSkills(agentId: string, skills: Skill[]): Promise<void> {
  const supabase = await createClient()

  // Get existing skills
  const existingSkills = await getAgentSkills(agentId)

  // Create map of existing skills by name for easy lookup
  const existingSkillsMap = new Map<string, AgentSkill>()
  existingSkills.forEach(skill => {
    existingSkillsMap.set(skill.name, skill)
  })

  // Process each skill in config
  for (const skill of skills) {
    const existingSkill = existingSkillsMap.get(skill.name)

    if (existingSkill) {
      // Update existing skill
      await updateAgentSkill(existingSkill.id, {
        action: skill.action,
        access_subscription_id: skill.accessSubscriptionId || null,
      })
      // Remove from map to track processed skills
      existingSkillsMap.delete(skill.name)
    } else {
      // Create new skill
      await createAgentSkill(agentId, {
        name: skill.name,
        action: skill.action,
        access_subscription_id: skill.accessSubscriptionId || null,
      })
    }
  }

  // Delete skills that are no longer in config
  for (const remainingSkill of existingSkillsMap.values()) {
    await deleteAgentSkill(remainingSkill.id)
  }
}

/**
 * Get agent skills
 */
export async function getAgentSkills(agentId: string): Promise<AgentSkill[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('agent_skills')
    .select('*')
    .eq('agent_id', agentId)
    .order('created_at', { ascending: true })

  if (error) {
    throw new Error(`Failed to get agent skills: ${error.message}`)
  }

  return data || []
}

/**
 * Create agent skill
 */
export async function createAgentSkill(
  agentId: string,
  skillData: {
    name: string
    action: string
    access_subscription_id: string | null
  }
): Promise<AgentSkill> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('agent_skills')
    .insert({
      agent_id: agentId,
      name: skillData.name,
      action: skillData.action,
      access_subscription_id: skillData.access_subscription_id,
    })
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create agent skill: ${error.message}`)
  }

  return data
}

/**
 * Update agent skill
 */
export async function updateAgentSkill(
  skillId: string,
  updateData: {
    name?: string
    action?: string
    access_subscription_id?: string | null
  }
): Promise<AgentSkill> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('agent_skills')
    .update({
      ...updateData,
      updated_at: new Date().toISOString(),
    })
    .eq('id', skillId)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to update agent skill: ${error.message}`)
  }

  return data
}

/**
 * Delete agent skill
 */
export async function deleteAgentSkill(skillId: string): Promise<void> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('agent_skills')
    .delete()
    .eq('id', skillId)

  if (error) {
    throw new Error(`Failed to delete agent skill: ${error.message}`)
  }
}

/**
 * Save a message in agent history
 */
export async function saveAgentMessage(
  agentId: string,
  role: AgentMessage['role'],
  content: Record<string, unknown>,
  toolUsed?: string
): Promise<AgentMessage> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('agent_messages')
    .insert({
      agent_id: agentId,
      role,
      content,
      tool_used: toolUsed || null,
    })
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to save agent message: ${error.message}`)
  }

  return data
}