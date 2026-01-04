/**
 * Unit tests for Agent Service (TDD)
 */
import { createClient } from '@/lib/supabase/server'
import {
  getAgentByClubId,
  setAgentConfig,
  getAgentSkills,
  createAgentSkill,
  updateAgentSkill,
  deleteAgentSkill,
} from '@/services/agentService'

// Mock Supabase client
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}))

const mockSupabase = {
  from: jest.fn(() => ({
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        single: jest.fn(),
        order: jest.fn(),
      })),
    })),
    insert: jest.fn(() => ({
      select: jest.fn(() => ({
        single: jest.fn(),
      })),
    })),
    update: jest.fn(() => ({
      eq: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn(),
        })),
      })),
    })),
    delete: jest.fn(() => ({
      eq: jest.fn(),
    })),
    upsert: jest.fn(() => ({
      select: jest.fn(() => ({
        single: jest.fn(),
      })),
    })),
  })),
  rpc: jest.fn(),
}

beforeEach(() => {
  jest.clearAllMocks()
    ; (createClient as jest.Mock).mockReturnValue(mockSupabase)
})

describe('getAgentByClubId', () => {
  it('should return agent when found', async () => {
    // GIVEN: Agent exists for club
    const mockAgent = {
      id: 'agent-123',
      club_id: 'club-123',
      system_prompt: 'Test prompt',
      base_context: null,
      temperature: 0.7,
    }
    mockSupabase.from.mockReturnValue({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn().mockResolvedValue({ data: mockAgent, error: null }),
        })),
      })),
    })

    // WHEN: Getting agent by club ID
    const result = await getAgentByClubId('club-123')

    // THEN: Should return the agent
    expect(result).toEqual(mockAgent)
    expect(createClient).toHaveBeenCalled()
  })

  it('should return null when agent not found', async () => {
    // GIVEN: No agent exists for club
    mockSupabase.from.mockReturnValue({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
        })),
      })),
    })

    // WHEN: Getting agent by club ID
    const result = await getAgentByClubId('club-123')

    // THEN: Should return null
    expect(result).toBeNull()
  })

  it('should throw error on database error', async () => {
    // GIVEN: Database error occurs
    mockSupabase.from.mockReturnValue({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn().mockResolvedValue({ data: null, error: { message: 'DB Error' } }),
        })),
      })),
    })

    // WHEN: Getting agent by club ID
    // THEN: Should throw error
    await expect(getAgentByClubId('club-123')).rejects.toThrow('DB Error')
  })
})

describe('setAgentConfig', () => {
  it('should create new agent when none exists', async () => {
    // GIVEN: No existing agent, valid config
    const config = {
      personality: {
        role: 'Test Agent',
        tone: 'didactico',
        temperature: 0.7,
      },
      context: {
        baseKnowledge: 'Test knowledge',
        boundaryRules: ['Rule 1'],
      },
      skills: [
        { name: 'Skill 1', action: 'Action 1' },
      ],
    }
    const expectedPrompt = 'You are Test Agent. Your tone is didactico.\n\nBase Knowledge: Test knowledge\n\nBoundary Rules:\n- Rule 1'

    mockSupabase.from.mockReturnValue({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
        })),
      })),
      insert: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn().mockResolvedValue({
            data: { id: 'agent-123', system_prompt: expectedPrompt },
            error: null,
          }),
        })),
      })),
    })

    // WHEN: Setting agent config
    const result = await setAgentConfig('club-123', config)

    // THEN: Should create new agent with correct prompt
    expect(result.id).toBe('agent-123')
    expect(result.system_prompt).toBe(expectedPrompt)
  })

  it('should update existing agent', async () => {
    // GIVEN: Existing agent, valid config
    const config = {
      personality: {
        role: 'Updated Agent',
        tone: 'entusiasta',
        temperature: 0.8,
      },
      context: {
        baseKnowledge: 'Updated knowledge',
        boundaryRules: ['Rule 1', 'Rule 2'],
      },
      skills: [],
    }
    const expectedPrompt = 'You are Updated Agent. Your tone is entusiasta.\n\nBase Knowledge: Updated knowledge\n\nBoundary Rules:\n- Rule 1\n- Rule 2'

    const existingAgent = { id: 'agent-123', club_id: 'club-123' }
    mockSupabase.from.mockReturnValue({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn().mockResolvedValue({ data: existingAgent, error: null }),
        })),
      })),
      update: jest.fn(() => ({
        eq: jest.fn(() => ({
          select: jest.fn(() => ({
            single: jest.fn().mockResolvedValue({
              data: { id: 'agent-123', system_prompt: expectedPrompt },
              error: null,
            }),
          })),
        })),
      })),
    })

    // WHEN: Setting agent config
    const result = await setAgentConfig('club-123', config)

    // THEN: Should update existing agent
    expect(result.system_prompt).toBe(expectedPrompt)
  })

  it('should handle skills creation and updates', async () => {
    // GIVEN: Config with skills
    const config = {
      personality: { role: 'Test', tone: 'didactico', temperature: 0.5 },
      context: { baseKnowledge: 'Test', boundaryRules: [] },
      skills: [
        { name: 'Skill 1', action: 'Action 1' },
        { name: 'Skill 2', action: 'Action 2', accessSubscriptionId: 'sub-123' },
      ],
    }

    const existingAgent = { id: 'agent-123' }
    mockSupabase.from
      .mockReturnValueOnce({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn().mockResolvedValue({ data: existingAgent, error: null }),
          })),
        })),
      })
      .mockReturnValueOnce({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            order: jest.fn().mockResolvedValue({ data: [], error: null }),
          })),
        })),
      })
      .mockReturnValueOnce({
        insert: jest.fn(() => ({
          select: jest.fn(() => ({
            single: jest.fn().mockResolvedValue({ data: { id: 'skill-1' }, error: null }),
          })),
        })),
      })

    // WHEN: Setting agent config with skills
    await setAgentConfig('club-123', config)

    // THEN: Should handle skills operations
    expect(mockSupabase.from).toHaveBeenCalledWith('agent_skills')
  })
})

describe('getAgentSkills', () => {
  it('should return agent skills', async () => {
    // GIVEN: Agent has skills
    const mockSkills = [
      { id: 'skill-1', name: 'Skill 1', action: 'Action 1' },
      { id: 'skill-2', name: 'Skill 2', action: 'Action 2' },
    ]
    mockSupabase.from.mockReturnValue({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          order: jest.fn().mockResolvedValue({ data: mockSkills, error: null }),
        })),
      })),
    })

    // WHEN: Getting agent skills
    const result = await getAgentSkills('agent-123')

    // THEN: Should return skills
    expect(result).toEqual(mockSkills)
  })
})

describe('createAgentSkill', () => {
  it('should create new skill', async () => {
    // GIVEN: Valid skill data
    const skillData = {
      name: 'New Skill',
      action: 'New Action',
      accessSubscriptionId: 'sub-123',
    }
    mockSupabase.from.mockReturnValue({
      insert: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn().mockResolvedValue({
            data: { id: 'skill-123', ...skillData },
            error: null,
          }),
        })),
      })),
    })

    // WHEN: Creating skill
    const result = await createAgentSkill('agent-123', skillData)

    // THEN: Should return created skill
    expect(result.id).toBe('skill-123')
    expect(result.name).toBe('New Skill')
  })
})

describe('updateAgentSkill', () => {
  it('should update existing skill', async () => {
    // GIVEN: Updated skill data
    const updateData = {
      name: 'Updated Skill',
      action: 'Updated Action',
    }
    mockSupabase.from.mockReturnValue({
      update: jest.fn(() => ({
        eq: jest.fn(() => ({
          select: jest.fn(() => ({
            single: jest.fn().mockResolvedValue({
              data: { id: 'skill-123', ...updateData },
              error: null,
            }),
          })),
        })),
      })),
    })

    // WHEN: Updating skill
    const result = await updateAgentSkill('skill-123', updateData)

    // THEN: Should return updated skill
    expect(result.name).toBe('Updated Skill')
  })
})

describe('deleteAgentSkill', () => {
  it('should delete skill', async () => {
    // GIVEN: Skill exists
    mockSupabase.from.mockReturnValue({
      delete: jest.fn(() => ({
        eq: jest.fn().mockResolvedValue({ error: null }),
      })),
    })

    // WHEN: Deleting skill
    await deleteAgentSkill('skill-123')

    // THEN: Should call delete operation
    expect(mockSupabase.from).toHaveBeenCalledWith('agent_skills')
  })
})