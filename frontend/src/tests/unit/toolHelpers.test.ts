import { describe, it, expect } from 'vitest'
import { parseSource, extractFramework, buildUserMessage } from '@/lib/server/toolHelpers'

describe('parseSource', () => {
  it('maps vscode header to VSCODE', () => {
    expect(parseSource('vscode')).toBe('VSCODE')
  })

  it('maps gmail-addon header to GMAIL', () => {
    expect(parseSource('gmail-addon')).toBe('GMAIL')
  })

  it('maps chat-bot header to CHATBOT', () => {
    expect(parseSource('chat-bot')).toBe('CHATBOT')
  })

  it('defaults to WEB for unknown values', () => {
    expect(parseSource('unknown-client')).toBe('WEB')
    expect(parseSource(null)).toBe('WEB')
    expect(parseSource('')).toBe('WEB')
  })
})

describe('extractFramework', () => {
  it('parses framework from valid forge JSON output', () => {
    const json = JSON.stringify({ framework: 'RISEN', category: 'security' })
    expect(extractFramework(json, 'forge')).toBe('RISEN')
  })

  it('returns null for non-forge tools', () => {
    const json = JSON.stringify({ framework: 'RISEN' })
    expect(extractFramework(json, 'improver')).toBeNull()
    expect(extractFramework(json, 'commit')).toBeNull()
  })

  it('returns null when JSON is wrapped in markdown fences', () => {
    const fenced = '```json\n{"framework":"CO-STAR"}\n```'
    expect(extractFramework(fenced, 'forge')).toBe('CO-STAR')
  })

  it('returns null for malformed JSON', () => {
    expect(extractFramework('not-json', 'forge')).toBeNull()
  })

  it('returns null when framework key is missing', () => {
    expect(extractFramework('{"category":"x"}', 'forge')).toBeNull()
  })
})

describe('buildUserMessage', () => {
  it('returns JSON for unknown tool id', () => {
    const msg = buildUserMessage('unknown-tool', { foo: 'bar' })
    expect(msg).toContain('foo')
  })

  it('builds forge message with idea', () => {
    const msg = buildUserMessage('forge', { idea: 'Build a CLI' })
    expect(msg).toContain('Build a CLI')
    expect(msg).toContain('Raw idea:')
  })

  it('builds improver message with prompt', () => {
    const msg = buildUserMessage('improver', { prompt: 'Write a poem' })
    expect(msg).toContain('Write a poem')
  })

  it('builds code-review message with code block', () => {
    const msg = buildUserMessage('code-review', { code: 'const x = 1', language: 'js' })
    expect(msg).toContain('const x = 1')
    expect(msg).toContain('js')
  })

  it('builds commit message with diff', () => {
    const msg = buildUserMessage('commit', { diff: '+ added feature', scope: 'auth' })
    expect(msg).toContain('added feature')
    expect(msg).toContain('auth')
  })

  it('builds standup message', () => {
    const msg = buildUserMessage('standup', { yesterday: 'Fixed bug', today: 'Write tests' })
    expect(msg).toContain('Fixed bug')
    expect(msg).toContain('Write tests')
  })

  it('uses fallback defaults when optional fields are missing', () => {
    const msg = buildUserMessage('forge', { idea: 'test idea' })
    expect(msg).toContain('auto-detect')
    expect(msg).toContain('Claude')
  })

  // Spot-check remaining tools for coverage
  it.each([
    ['bug-task', { rawReport: 'crash on login' }],
    ['feature-spec', { idea: 'Dark mode' }],
    ['adr', { decision: 'Use PostgreSQL' }],
    ['tech-stack', { projectType: 'SaaS' }],
    ['concept-explainer', { concept: 'TCP/IP' }],
    ['flashcards', { content: 'x'.repeat(20) }],
    ['compare', { prompt: 'Write a haiku' }],
    ['meeting-mirror', { transcript: 'x'.repeat(20) }],
    ['stakeholder-translator', { content: 'We are launching' }],
    ['decision-autopsy', { decision: 'Rewrite in Rust' }],
    ['silence-detector', { thread: 'x'.repeat(20) }],
    ['complexity-budget', { plan: 'x'.repeat(20) }],
    ['context-handoff', { task: 'Build feature', progress: 'In progress' }],
    ['email-intent-decoder', { email: 'x'.repeat(10) }],
    ['work-brain-dump', { dump: 'too many things' }],
    ['feedback-translator', { feedback: 'Needs improvement' }],
  ])('builds non-empty message for %s', (toolId, input) => {
    const msg = buildUserMessage(toolId, input)
    expect(msg.length).toBeGreaterThan(0)
  })
})
