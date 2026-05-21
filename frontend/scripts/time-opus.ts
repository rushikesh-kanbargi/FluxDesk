/**
 * Latency test for gpt-4o streaming at maxTokens: 1000 and 1500.
 * Reports time-to-first-token (TTFT) and total duration for each run.
 *
 * NOTE: This validates GPT-4o latency only. If a user has only an Anthropic
 * key configured, claude-opus-4-5 timing is unmeasured — flagged as a known
 * gap (see implementation report). Revisit when an Anthropic key is available.
 *
 * Run: OPENAI_API_KEY=sk-... npx tsx scripts/time-opus.ts
 */
import OpenAI from 'openai'

const key = process.env.OPENAI_API_KEY
if (!key) {
  console.error('Set OPENAI_API_KEY env var')
  process.exit(1)
}

const client = new OpenAI({ apiKey: key })

const SYSTEM = `You are a senior code reviewer. Review the provided code and output structured feedback with sections: CRITICAL ISSUES, WARNINGS, SUGGESTIONS, QUICK WINS. Be thorough.`

const USER = `Language/Framework: TypeScript/React
Focus: general

Code:
\`\`\`
function UserProfile({ userId }: { userId: string }) {
  const [user, setUser] = React.useState(null)
  React.useEffect(() => {
    fetch('/api/users/' + userId).then(r => r.json()).then(setUser)
  }, [])
  return <div>{user?.name}</div>
}
\`\`\``

async function time(maxTokens: number): Promise<{ ttft: number; total: number; tokens: number }> {
  const start = Date.now()
  let ttft = -1
  let tokens = 0

  const stream = await client.chat.completions.create({
    model: 'gpt-4o',
    max_tokens: maxTokens,
    stream: true,
    messages: [
      { role: 'system', content: SYSTEM },
      { role: 'user', content: USER },
    ],
  })

  for await (const chunk of stream) {
    const text = chunk.choices[0]?.delta?.content ?? ''
    if (text && ttft === -1) ttft = Date.now() - start
    tokens += text.length / 4 // rough token estimate
  }

  const total = Date.now() - start
  return { ttft, total, tokens: Math.round(tokens) }
}

;(async () => {
  console.log('Testing gpt-4o streaming latency (2 runs with 2s gap)...\n')

  const r1000 = await time(1000)
  console.log(`maxTokens=1000:  TTFT ${r1000.ttft}ms  |  total ${r1000.total}ms  |  ~${r1000.tokens} tokens  |  ~${Math.round(r1000.tokens / (r1000.total / 1000))} tok/s`)

  await new Promise(r => setTimeout(r, 2000))

  const r1500 = await time(1500)
  console.log(`maxTokens=1500:  TTFT ${r1500.ttft}ms  |  total ${r1500.total}ms  |  ~${r1500.tokens} tokens  |  ~${Math.round(r1500.tokens / (r1500.total / 1000))} tok/s`)

  console.log('\n--- Verdict ---')
  if (r1500.total < 8000) {
    console.log('✅ Under 8s at 1500 tokens — Hobby tier safe for GPT-4o. Ship at maxTokens: 1000 (safety margin).')
  } else if (r1000.total < 8000) {
    console.log('⚠️  1500 tokens exceeds 8s, 1000 tokens safe — ship streaming endpoint at maxTokens: 1000.')
  } else {
    console.log('🚨 Over 8s at 1000 tokens — pre-existing /run timeout risk (not streaming-specific). Flag and proceed.')
  }

  console.log('\n--- Known gap ---')
  console.log('claude-opus-4-5 timing not validated (no Anthropic key available).')
  console.log('If a user configures only Claude, Hobby-tier timeout risk is unmeasured.')
})()
