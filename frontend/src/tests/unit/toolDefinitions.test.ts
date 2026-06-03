import { describe, it, expect } from 'vitest'
import { TOOLS, getToolById } from '@/lib/server/toolDefinitions'

describe('TOOLS registry', () => {
  it('exports exactly 22 tools', () => {
    expect(Object.keys(TOOLS)).toHaveLength(22)
  })

  it('every tool has id, name, description, schema, buildSystem', () => {
    for (const tool of Object.values(TOOLS)) {
      expect(tool.id).toBeTruthy()
      expect(tool.name).toBeTruthy()
      expect(tool.description).toBeTruthy()
      expect(tool.schema).toBeDefined()
      expect(typeof tool.buildSystem).toBe('function')
    }
  })

  it('buildSystem returns a non-empty string', () => {
    for (const tool of Object.values(TOOLS)) {
      const sys = tool.buildSystem('')
      expect(typeof sys).toBe('string')
      expect(sys.length).toBeGreaterThan(0)
    }
  })

  it('buildSystem prepends the personalisation string', () => {
    const sys = TOOLS.forge.buildSystem('CUSTOM_PREFIX:')
    expect(sys.startsWith('CUSTOM_PREFIX:')).toBe(true)
  })
})

describe('getToolById', () => {
  it('finds a tool by kebab-case id', () => {
    const tool = getToolById('code-review')
    expect(tool).toBeDefined()
    expect(tool?.name).toBe('Code Review Brief')
  })

  it('returns undefined for an unknown id', () => {
    expect(getToolById('does-not-exist')).toBeUndefined()
  })

  it('finds all 22 tools by their own id', () => {
    for (const tool of Object.values(TOOLS)) {
      expect(getToolById(tool.id)).toBe(tool)
    }
  })
})

describe('Tool schema validation', () => {
  describe('forge', () => {
    it('accepts a valid idea', () => {
      const r = TOOLS.forge.schema.safeParse({ idea: 'Build a CLI todo app' })
      expect(r.success).toBe(true)
    })

    it('rejects when idea is too short (< 5 chars)', () => {
      const r = TOOLS.forge.schema.safeParse({ idea: 'hi' })
      expect(r.success).toBe(false)
    })

    it('rejects when idea exceeds 2000 chars', () => {
      const r = TOOLS.forge.schema.safeParse({ idea: 'a'.repeat(2001) })
      expect(r.success).toBe(false)
    })

    it('accepts optional fields', () => {
      const r = TOOLS.forge.schema.safeParse({
        idea: 'Build a REST API',
        category: 'backend',
        targetAi: 'claude',
        framework: 'RISEN',
      })
      expect(r.success).toBe(true)
    })
  })

  describe('improver', () => {
    it('rejects when prompt is too short (< 10 chars)', () => {
      const r = TOOLS.improver.schema.safeParse({ prompt: 'short' })
      expect(r.success).toBe(false)
    })

    it('rejects when prompt exceeds 3000 chars', () => {
      const r = TOOLS.improver.schema.safeParse({ prompt: 'x'.repeat(3001) })
      expect(r.success).toBe(false)
    })

    it('accepts a valid prompt', () => {
      const r = TOOLS.improver.schema.safeParse({ prompt: 'Explain quantum computing simply' })
      expect(r.success).toBe(true)
    })
  })

  describe('codeReview', () => {
    it('accepts valid code with optional fields', () => {
      const r = TOOLS.codeReview.schema.safeParse({
        code: 'function add(a, b) { return a + b }',
        language: 'javascript',
        focus: 'security',
      })
      expect(r.success).toBe(true)
    })

    it('rejects invalid focus enum value', () => {
      const r = TOOLS.codeReview.schema.safeParse({
        code: 'const x = 1',
        focus: 'invalid-focus',
      })
      expect(r.success).toBe(false)
    })

    it('rejects when code exceeds 8000 chars', () => {
      const r = TOOLS.codeReview.schema.safeParse({ code: 'x'.repeat(8001) })
      expect(r.success).toBe(false)
    })
  })

  describe('bugTask', () => {
    it('rejects invalid format enum', () => {
      const r = TOOLS.bugTask.schema.safeParse({
        rawReport: 'Button crash on click',
        format: 'trello',
      })
      expect(r.success).toBe(false)
    })

    it('accepts valid linear format', () => {
      const r = TOOLS.bugTask.schema.safeParse({
        rawReport: 'Button crash on click in Safari',
        format: 'linear',
      })
      expect(r.success).toBe(true)
    })
  })

  describe('standup', () => {
    it('accepts valid standup input', () => {
      const r = TOOLS.standup.schema.safeParse({
        yesterday: 'Fixed auth bug',
        today: 'Work on dashboard',
        tone: 'concise',
      })
      expect(r.success).toBe(true)
    })

    it('rejects invalid tone enum', () => {
      const r = TOOLS.standup.schema.safeParse({
        yesterday: 'Fixed auth bug',
        today: 'Work on dashboard',
        tone: 'verbose',
      })
      expect(r.success).toBe(false)
    })
  })

  describe('flashcards', () => {
    it('rejects count outside 3-20 range', () => {
      const tooFew = TOOLS.flashcards.schema.safeParse({
        content: 'x'.repeat(20),
        count: 2,
      })
      const tooMany = TOOLS.flashcards.schema.safeParse({
        content: 'x'.repeat(20),
        count: 21,
      })
      expect(tooFew.success).toBe(false)
      expect(tooMany.success).toBe(false)
    })
  })

  describe('stakeholderTranslator', () => {
    it('rejects invalid audience value in array', () => {
      const r = TOOLS.stakeholderTranslator.schema.safeParse({
        content: 'We are launching a new product',
        audiences: ['ceo', 'investor'],
      })
      expect(r.success).toBe(false)
    })

    it('accepts valid audience array', () => {
      const r = TOOLS.stakeholderTranslator.schema.safeParse({
        content: 'We are launching a new product next quarter',
        audiences: ['ceo', 'engineer'],
      })
      expect(r.success).toBe(true)
    })
  })

  describe('featureSpec', () => {
    it('rejects invalid audience enum', () => {
      const r = TOOLS.featureSpec.schema.safeParse({
        idea: 'Dark mode toggle',
        audience: 'investor',
      })
      expect(r.success).toBe(false)
    })

    it('rejects idea exceeding 500 chars', () => {
      const r = TOOLS.featureSpec.schema.safeParse({ idea: 'x'.repeat(501) })
      expect(r.success).toBe(false)
    })
  })

  describe('conceptExplainer', () => {
    it('accepts valid level enum values', () => {
      const levels = ['eli5', 'beginner', 'intermediate', 'advanced', 'expert'] as const
      for (const level of levels) {
        const r = TOOLS.conceptExplainer.schema.safeParse({ concept: 'TCP/IP', level })
        expect(r.success).toBe(true)
      }
    })

    it('rejects invalid level', () => {
      const r = TOOLS.conceptExplainer.schema.safeParse({
        concept: 'TCP/IP',
        level: 'PhD',
      })
      expect(r.success).toBe(false)
    })
  })

  describe('silenceDetector', () => {
    it('accepts valid medium values', () => {
      for (const medium of ['email', 'slack', 'meeting', 'other'] as const) {
        const r = TOOLS.silenceDetector.schema.safeParse({
          thread: 'x'.repeat(20),
          medium,
        })
        expect(r.success).toBe(true)
      }
    })
  })

  describe('prDesc', () => {
    const validDiff = '--- a/index.ts\n+++ b/index.ts\n@@ -1,3 +1,4 @@'

    it('accepts a valid diff', () => {
      const r = TOOLS.prDesc.schema.safeParse({ diff: validDiff })
      expect(r.success).toBe(true)
    })

    it('rejects diff shorter than 10 chars', () => {
      const r = TOOLS.prDesc.schema.safeParse({ diff: 'short' })
      expect(r.success).toBe(false)
    })

    it('rejects diff exceeding 6000 chars', () => {
      const r = TOOLS.prDesc.schema.safeParse({ diff: 'x'.repeat(6001) })
      expect(r.success).toBe(false)
    })

    it('rejects title exceeding 200 chars', () => {
      const r = TOOLS.prDesc.schema.safeParse({ diff: validDiff, title: 'x'.repeat(201) })
      expect(r.success).toBe(false)
    })

    it('rejects ticket exceeding 200 chars', () => {
      const r = TOOLS.prDesc.schema.safeParse({ diff: validDiff, ticket: 'x'.repeat(201) })
      expect(r.success).toBe(false)
    })

    it('accepts all optional fields together', () => {
      const r = TOOLS.prDesc.schema.safeParse({
        diff: validDiff,
        title: 'Add user authentication',
        ticket: 'FLUX-42',
      })
      expect(r.success).toBe(true)
    })

    it('getToolById returns tool with name PR Description', () => {
      const tool = getToolById('pr-desc')
      expect(tool).toBeDefined()
      expect(tool?.name).toBe('PR Description')
    })
  })
})
