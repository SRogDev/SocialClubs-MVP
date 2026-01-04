/**
 * Unit tests for Agent Configuration Schema (TDD)
 */
import {
  agentConfigSchema,
  personalitySchema,
  contextSchema,
  skillSchema,
  agentSkillsSchema,
} from '@/schemas/agentSchema'

describe('agentConfigSchema', () => {
  describe('personalitySchema', () => {
    it('should validate valid personality configuration', () => {
      // GIVEN: Valid personality data
      const validPersonality = {
        role: 'Asistente experto en programación',
        tone: 'didactico',
        temperature: 0.7,
      }

      // WHEN: Validating personality
      const result = personalitySchema.safeParse(validPersonality)

      // THEN: Should pass validation
      expect(result.success).toBe(true)
    })

    it('should reject invalid tone option', () => {
      // GIVEN: Invalid tone value
      const invalidPersonality = {
        role: 'Asistente',
        tone: 'invalid_tone',
        temperature: 0.5,
      }

      // WHEN: Validating personality
      const result = personalitySchema.safeParse(invalidPersonality)

      // THEN: Should fail validation
      expect(result.success).toBe(false)
    })

    it('should reject temperature below 0', () => {
      // GIVEN: Temperature below minimum
      const invalidPersonality = {
        role: 'Asistente',
        tone: 'alegre',
        temperature: -0.1,
      }

      // WHEN: Validating personality
      const result = personalitySchema.safeParse(invalidPersonality)

      // THEN: Should fail validation
      expect(result.success).toBe(false)
    })

    it('should reject temperature above 1', () => {
      // GIVEN: Temperature above maximum
      const invalidPersonality = {
        role: 'Asistente',
        tone: 'reflexivo',
        temperature: 1.1,
      }

      // WHEN: Validating personality
      const result = personalitySchema.safeParse(invalidPersonality)

      // THEN: Should fail validation
      expect(result.success).toBe(false)
    })

    it('should require role field', () => {
      // GIVEN: Missing role
      const invalidPersonality = {
        tone: 'sarcastico',
        temperature: 0.5,
      }

      // WHEN: Validating personality
      const result = personalitySchema.safeParse(invalidPersonality)

      // THEN: Should fail validation
      expect(result.success).toBe(false)
    })

    it('should validate all tone options', () => {
      // GIVEN: All valid tone options
      const validTones = ['didactico', 'entusiasta', 'reflexivo', 'sarcastico', 'alegre']

      // WHEN: Validating each tone
      validTones.forEach((tone) => {
        const personality = {
          role: 'Test role',
          tone,
          temperature: 0.7,
        }
        const result = personalitySchema.safeParse(personality)

        // THEN: All should pass validation
        expect(result.success).toBe(true)
      })
    })
  })

  describe('contextSchema', () => {
    it('should validate valid context configuration', () => {
      // GIVEN: Valid context data
      const validContext = {
        baseKnowledge: 'Este agente ayuda con programación y desarrollo web',
        boundaryRules: [
          'No proporcionar información médica',
          'No dar consejos financieros',
        ],
      }

      // WHEN: Validating context
      const result = contextSchema.safeParse(validContext)

      // THEN: Should pass validation
      expect(result.success).toBe(true)
    })

    it('should reject more than 5 boundary rules', () => {
      // GIVEN: More than 5 rules
      const invalidContext = {
        baseKnowledge: 'Test knowledge',
        boundaryRules: [
          'Rule 1',
          'Rule 2',
          'Rule 3',
          'Rule 4',
          'Rule 5',
          'Rule 6',
        ],
      }

      // WHEN: Validating context
      const result = contextSchema.safeParse(invalidContext)

      // THEN: Should fail validation
      expect(result.success).toBe(false)
    })

    it('should allow empty boundary rules', () => {
      // GIVEN: Empty rules array
      const validContext = {
        baseKnowledge: 'Test knowledge',
        boundaryRules: [],
      }

      // WHEN: Validating context
      const result = contextSchema.safeParse(validContext)

      // THEN: Should pass validation
      expect(result.success).toBe(true)
    })

    it('should allow optional baseKnowledge', () => {
      // GIVEN: Missing baseKnowledge
      const validContext = {
        boundaryRules: ['Rule 1'],
      }

      // WHEN: Validating context
      const result = contextSchema.safeParse(validContext)

      // THEN: Should pass validation
      expect(result.success).toBe(true)
    })
  })

  describe('skillSchema', () => {
    it('should validate valid skill configuration', () => {
      // GIVEN: Valid skill data
      const validSkill = {
        name: 'Search Database',
        action: 'Buscar información en la base de datos del club',
        accessSubscriptionId: 'sub-123',
      }

      // WHEN: Validating skill
      const result = skillSchema.safeParse(validSkill)

      // THEN: Should pass validation
      expect(result.success).toBe(true)
    })

    it('should require name field', () => {
      // GIVEN: Missing name
      const invalidSkill = {
        action: 'Test action',
        accessSubscriptionId: 'sub-123',
      }

      // WHEN: Validating skill
      const result = skillSchema.safeParse(invalidSkill)

      // THEN: Should fail validation
      expect(result.success).toBe(false)
    })

    it('should require action field', () => {
      // GIVEN: Missing action
      const invalidSkill = {
        name: 'Test skill',
        accessSubscriptionId: 'sub-123',
      }

      // WHEN: Validating skill
      const result = skillSchema.safeParse(invalidSkill)

      // THEN: Should fail validation
      expect(result.success).toBe(false)
    })

    it('should allow optional accessSubscriptionId', () => {
      // GIVEN: Missing accessSubscriptionId
      const validSkill = {
        name: 'Public Skill',
        action: 'Accessible to all',
      }

      // WHEN: Validating skill
      const result = skillSchema.safeParse(validSkill)

      // THEN: Should pass validation
      expect(result.success).toBe(true)
    })
  })

  describe('agentSkillsSchema', () => {
    it('should validate valid skills array', () => {
      // GIVEN: Valid skills array with less than 4 items
      const validSkills = [
        { name: 'Skill 1', action: 'Action 1' },
        { name: 'Skill 2', action: 'Action 2' },
      ]

      // WHEN: Validating skills
      const result = agentSkillsSchema.safeParse(validSkills)

      // THEN: Should pass validation
      expect(result.success).toBe(true)
    })

    it('should reject more than 4 skills', () => {
      // GIVEN: More than 4 skills
      const invalidSkills = [
        { name: 'Skill 1', action: 'Action 1' },
        { name: 'Skill 2', action: 'Action 2' },
        { name: 'Skill 3', action: 'Action 3' },
        { name: 'Skill 4', action: 'Action 4' },
        { name: 'Skill 5', action: 'Action 5' },
      ]

      // WHEN: Validating skills
      const result = agentSkillsSchema.safeParse(invalidSkills)

      // THEN: Should fail validation
      expect(result.success).toBe(false)
    })

    it('should allow empty skills array', () => {
      // GIVEN: Empty skills array
      const validSkills: any[] = []

      // WHEN: Validating skills
      const result = agentSkillsSchema.safeParse(validSkills)

      // THEN: Should pass validation
      expect(result.success).toBe(true)
    })
  })

  describe('agentConfigSchema (complete)', () => {
    it('should validate complete agent configuration', () => {
      // GIVEN: Complete valid agent config
      const validConfig = {
        personality: {
          role: 'Asistente del club',
          tone: 'entusiasta',
          temperature: 0.8,
        },
        context: {
          baseKnowledge: 'Ayuda a los miembros del club',
          boundaryRules: ['No dar información personal'],
        },
        skills: [
          { name: 'Search', action: 'Search database' },
        ],
      }

      // WHEN: Validating complete config
      const result = agentConfigSchema.safeParse(validConfig)

      // THEN: Should pass validation
      expect(result.success).toBe(true)
    })

    it('should require personality section', () => {
      // GIVEN: Missing personality
      const invalidConfig = {
        context: {
          baseKnowledge: 'Test',
          boundaryRules: [],
        },
        skills: [],
      }

      // WHEN: Validating config
      const result = agentConfigSchema.safeParse(invalidConfig)

      // THEN: Should fail validation
      expect(result.success).toBe(false)
    })

    it('should require context section', () => {
      // GIVEN: Missing context
      const invalidConfig = {
        personality: {
          role: 'Test',
          tone: 'alegre',
          temperature: 0.5,
        },
        skills: [],
      }

      // WHEN: Validating config
      const result = agentConfigSchema.safeParse(invalidConfig)

      // THEN: Should fail validation
      expect(result.success).toBe(false)
    })

    it('should require skills section', () => {
      // GIVEN: Missing skills
      const invalidConfig = {
        personality: {
          role: 'Test',
          tone: 'alegre',
          temperature: 0.5,
        },
        context: {
          baseKnowledge: 'Test',
          boundaryRules: [],
        },
      }

      // WHEN: Validating config
      const result = agentConfigSchema.safeParse(invalidConfig)

      // THEN: Should fail validation
      expect(result.success).toBe(false)
    })
  })
})
