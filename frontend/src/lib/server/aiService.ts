import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'
import { GoogleGenerativeAI } from '@google/generative-ai'
import Groq from 'groq-sdk'
import { prisma } from './prisma'
import { logger } from './logger'
import { encrypt, decrypt } from './encryption'
// NOTE: run scripts/migrate-api-keys.ts to re-encrypt existing base64 keys

export type AIProvider = 'CLAUDE' | 'OPENAI' | 'GEMINI' | 'GROQ'

export interface AIMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface AICallOptions {
  userId: string
  system: string
  messages: AIMessage[]
  maxTokens?: number
  preferredProvider?: AIProvider
  /**
   * Demo mode — approach (b): inject platform key directly, bypassing user key lookup.
   * When set, the platform's provider+key are used regardless of user's configured keys.
   * The key is never written to the DB; it comes from PLATFORM_OPENAI_KEY env var.
   * See demoService.getPlatformKeyOption() for the source.
   */
  platformKey?: { provider: AIProvider; key: string }
}

interface DecryptedKey {
  provider: AIProvider
  key: string
}

function encryptKey(raw: string): string {
  return encrypt(raw)
}

export function decryptKey(enc: string): string {
  return decrypt(enc)
}

export function maskKey(raw: string): string {
  return '••••••••' + raw.slice(-4)
}

export async function getUserApiKeys(userId: string): Promise<DecryptedKey[]> {
  const keys = await prisma.apiKey.findMany({ where: { userId, isActive: true } })
  return keys.map((k) => ({ provider: k.provider as AIProvider, key: decryptKey(k.keyHash) }))
}

export async function saveUserApiKey(userId: string, provider: AIProvider, rawKey: string): Promise<void> {
  const keyHash = encryptKey(rawKey)
  const keyHint = rawKey.slice(-4)
  await prisma.apiKey.upsert({
    where: { userId_provider: { userId, provider } },
    create: { userId, provider, keyHash, keyHint },
    update: { keyHash, keyHint, isActive: true },
  })
}

async function selectProvider(
  userId: string,
  preferred?: AIProvider
): Promise<{ provider: AIProvider; key: string } | null> {
  const keys = await getUserApiKeys(userId)
  if (!keys.length) return null

  if (preferred) {
    const found = keys.find((k) => k.provider === preferred)
    if (found) return found
  }

  const memory = await prisma.userMemory.findUnique({ where: { userId } })
  if (memory?.preferredProvider) {
    const found = keys.find((k) => k.provider === memory.preferredProvider)
    if (found) return found
  }

  return keys[0]
}

async function callProvider(
  provider: AIProvider,
  key: string,
  system: string,
  messages: AIMessage[],
  maxTokens: number
): Promise<string> {
  if (provider === 'CLAUDE') {
    const client = new Anthropic({ apiKey: key })
    const resp = await client.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: maxTokens,
      system,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
    })
    return resp.content
      .filter((b) => b.type === 'text')
      .map((b) => (b as { type: 'text'; text: string }).text)
      .join('')
  } else if (provider === 'OPENAI') {
    const client = new OpenAI({ apiKey: key })
    const resp = await client.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: maxTokens,
      messages: [
        { role: 'system', content: system },
        ...messages.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
      ],
    })
    return resp.choices[0]?.message?.content || ''
  } else if (provider === 'GEMINI') {
    const client = new GoogleGenerativeAI(key)
    const model = client.getGenerativeModel({ model: 'gemini-1.5-pro' })
    const chat = model.startChat({
      systemInstruction: system,
      history: messages.slice(0, -1).map((m) => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.content }],
      })),
    })
    const last = messages[messages.length - 1]
    const resp = await chat.sendMessage(last.content)
    return resp.response.text()
  } else if (provider === 'GROQ') {
    const client = new Groq({ apiKey: key })
    const resp = await client.chat.completions.create({
      model: 'llama-3.1-70b-versatile',
      max_tokens: maxTokens,
      messages: [
        { role: 'system', content: system },
        ...messages.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
      ],
    })
    return resp.choices[0]?.message?.content || ''
  }
  throw new Error(`Unsupported provider: ${provider}`)
}

/**
 * Yields raw text chunks from a single provider's streaming API.
 * Errors thrown here surface during iteration in the calling route.
 * No mid-stream provider failover is possible once this generator starts yielding.
 */
async function* streamProvider(
  provider: AIProvider,
  key: string,
  system: string,
  messages: AIMessage[],
  maxTokens: number
): AsyncGenerator<string> {
  if (provider === 'CLAUDE') {
    const client = new Anthropic({ apiKey: key })
    const stream = client.messages.stream({
      model: 'claude-opus-4-5',
      max_tokens: maxTokens,
      system,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
    })
    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        yield event.delta.text
      }
    }
  } else if (provider === 'OPENAI') {
    const client = new OpenAI({ apiKey: key })
    const stream = await client.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: maxTokens,
      stream: true,
      messages: [
        { role: 'system', content: system },
        ...messages.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
      ],
    })
    for await (const chunk of stream) {
      const text = chunk.choices[0]?.delta?.content
      if (text) yield text
    }
  } else if (provider === 'GEMINI') {
    const client = new GoogleGenerativeAI(key)
    const model = client.getGenerativeModel({ model: 'gemini-1.5-pro' })
    const chat = model.startChat({
      systemInstruction: system,
      history: messages.slice(0, -1).map((m) => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.content }],
      })),
    })
    const last = messages[messages.length - 1]
    const result = await chat.sendMessageStream(last.content)
    for await (const chunk of result.stream) {
      const text = chunk.text()
      if (text) yield text
    }
  } else if (provider === 'GROQ') {
    const client = new Groq({ apiKey: key })
    const stream = await client.chat.completions.create({
      model: 'llama-3.1-70b-versatile',
      max_tokens: maxTokens,
      stream: true,
      messages: [
        { role: 'system', content: system },
        ...messages.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
      ],
    })
    for await (const chunk of stream) {
      const text = chunk.choices[0]?.delta?.content
      if (text) yield text
    }
  } else {
    throw new Error(`Unsupported provider: ${provider}`)
  }
}

/**
 * Selects the best available provider and returns its streaming generator.
 * Provider selection (and key validation) happens before streaming begins —
 * after the first chunk is yielded, failover to another provider is not possible.
 *
 * Throws synchronously (before any streaming) if no API key is configured.
 */
export async function streamAI(options: AICallOptions): Promise<{
  stream: AsyncGenerator<string>
  provider: AIProvider
}> {
  const { userId, system, messages, maxTokens = 1500, preferredProvider, platformKey } = options

  // Demo mode: use platform key directly, skip user key lookup entirely
  if (platformKey) {
    logger.debug(`AI stream (demo): ${platformKey.provider}`)
    return {
      stream: streamProvider(platformKey.provider, platformKey.key, system, messages, maxTokens),
      provider: platformKey.provider,
    }
  }

  const allKeys = await getUserApiKeys(userId)
  if (!allKeys.length) {
    throw Object.assign(
      new Error('No API key configured. Go to Settings → API Keys to add one.'),
      { status: 402 }
    )
  }

  const preferred = await selectProvider(userId, preferredProvider)
  const { provider, key } = preferred ?? allKeys[0]

  logger.debug(`AI stream: ${provider}`)
  return {
    stream: streamProvider(provider, key, system, messages, maxTokens),
    provider,
  }
}

export async function callAI(options: AICallOptions): Promise<{ text: string; provider: AIProvider }> {
  const { userId, system, messages, maxTokens = 1500, preferredProvider, platformKey } = options

  // Demo mode: use platform key directly
  if (platformKey) {
    logger.debug(`AI call (demo): ${platformKey.provider}`)
    const text = await callProvider(platformKey.provider, platformKey.key, system, messages, maxTokens)
    return { text, provider: platformKey.provider }
  }

  const allKeys = await getUserApiKeys(userId)
  if (!allKeys.length) {
    throw Object.assign(
      new Error('No API key configured. Go to Settings → API Keys to add one.'),
      { status: 402 }
    )
  }

  // Build ordered list: preferred/memory first, then remaining keys
  const preferred = await selectProvider(userId, preferredProvider)
  const orderedKeys: DecryptedKey[] = preferred
    ? [preferred, ...allKeys.filter((k) => k.provider !== preferred.provider)]
    : allKeys

  const start = Date.now()
  let lastError: unknown

  for (const { provider, key } of orderedKeys) {
    try {
      const text = await callProvider(provider, key, system, messages, maxTokens)
      logger.debug(`AI call: ${provider} in ${Date.now() - start}ms`)
      return { text, provider }
    } catch (err: unknown) {
      const e = err as Error & { status?: number }
      logger.error(`AI call failed (${provider}): ${e.message}`)
      if (e.status === 401 || e.message?.includes('invalid') || e.message?.includes('API key')) {
        throw Object.assign(
          new Error(`Invalid ${provider} API key. Please check your key in Settings.`),
          { status: 401 }
        )
      }
      lastError = err
      // Try next provider
    }
  }

  throw lastError
}
