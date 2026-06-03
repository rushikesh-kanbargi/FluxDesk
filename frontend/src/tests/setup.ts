import { vi } from 'vitest'

// ── Prisma ────────────────────────────────────────────────────────────────────
// Provide a typed in-memory mock so tests never touch a real database.
// Individual tests can override specific methods with vi.mocked(prisma.x).mockResolvedValueOnce(...)
vi.mock('@/lib/server/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
      updateMany: vi.fn(),
      count: vi.fn(),
    },
    apiKey: {
      findMany: vi.fn(),
      upsert: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    userMemory: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
      update: vi.fn(),
    },
    pipeline: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
    },
    pipelineRun: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    toolUsage: {
      create: vi.fn(),
      update: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}))

// ── Supabase service client ───────────────────────────────────────────────────
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    auth: {
      getUser: vi.fn(),
    },
  })),
}))

// ── Environment baseline ──────────────────────────────────────────────────────
process.env.ENCRYPTION_KEY = '0'.repeat(64)        // 32-byte all-zeros key for tests
// NODE_ENV is set by Vitest automatically; assigning it here would be a type error in tsc
