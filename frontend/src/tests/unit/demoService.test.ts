import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { prisma } from '@/lib/server/prisma'
import * as aiService from '@/lib/server/aiService'
import {
  checkDemoEligibility,
  claimDemoRun,
  DEMO_RUNS_MAX,
} from '@/lib/server/demoService'

vi.mock('@/lib/server/aiService', () => ({
  getUserApiKeys: vi.fn(),
}))

const mockGetUserApiKeys = vi.mocked(aiService.getUserApiKeys)
const mockUserFindUnique = vi.mocked(prisma.user.findUnique)
const mockUserUpdateMany = vi.mocked(prisma.user.updateMany)

const USER_ID = 'user-test-123'
const IP = '127.0.0.1'

beforeEach(() => {
  vi.clearAllMocks()
  // Default: demo enabled + platform key present
  process.env.PLATFORM_DEMO_ENABLED = 'true'
  process.env.PLATFORM_OPENAI_KEY = 'sk-test-platform-key'
})

afterEach(() => {
  delete process.env.PLATFORM_DEMO_ENABLED
  delete process.env.PLATFORM_OPENAI_KEY
})

describe('checkDemoEligibility', () => {
  it('returns disabled when PLATFORM_DEMO_ENABLED is not true', async () => {
    process.env.PLATFORM_DEMO_ENABLED = 'false'
    const result = await checkDemoEligibility(USER_ID, IP)
    expect(result.eligible).toBe(false)
    expect(result.reason).toBe('disabled')
  })

  it('returns disabled when PLATFORM_DEMO_ENABLED is unset', async () => {
    delete process.env.PLATFORM_DEMO_ENABLED
    const result = await checkDemoEligibility(USER_ID, IP)
    expect(result.eligible).toBe(false)
    expect(result.reason).toBe('disabled')
  })

  it('returns no_platform_key when PLATFORM_OPENAI_KEY is missing', async () => {
    delete process.env.PLATFORM_OPENAI_KEY
    const result = await checkDemoEligibility(USER_ID, IP)
    expect(result.eligible).toBe(false)
    expect(result.reason).toBe('no_platform_key')
  })

  it('returns has_own_key when user has BYOK keys', async () => {
    mockGetUserApiKeys.mockResolvedValue([{ provider: 'OPENAI', key: 'sk-user-key' }])
    mockUserFindUnique.mockResolvedValue({ demoRunsUsed: 0 } as never)

    const result = await checkDemoEligibility(USER_ID, IP)
    expect(result.eligible).toBe(false)
    expect(result.reason).toBe('has_own_key')
    expect(result.hasOwnKey).toBe(true)
  })

  it('returns limit_reached when user has exhausted all runs', async () => {
    mockGetUserApiKeys.mockResolvedValue([])
    mockUserFindUnique.mockResolvedValue({ demoRunsUsed: DEMO_RUNS_MAX } as never)

    const result = await checkDemoEligibility(USER_ID, IP)
    expect(result.eligible).toBe(false)
    expect(result.reason).toBe('limit_reached')
    expect(result.runsUsed).toBe(DEMO_RUNS_MAX)
  })

  it('returns eligible for a fresh user with no keys', async () => {
    mockGetUserApiKeys.mockResolvedValue([])
    mockUserFindUnique.mockResolvedValue({ demoRunsUsed: 0 } as never)

    const result = await checkDemoEligibility(USER_ID, IP)
    expect(result.eligible).toBe(true)
    expect(result.reason).toBeUndefined()
    expect(result.runsUsed).toBe(0)
    expect(result.hasOwnKey).toBe(false)
  })

  it('returns eligible when user still has runs remaining (3/5 used)', async () => {
    mockGetUserApiKeys.mockResolvedValue([])
    mockUserFindUnique.mockResolvedValue({ demoRunsUsed: 3 } as never)

    const result = await checkDemoEligibility(USER_ID, IP)
    expect(result.eligible).toBe(true)
    expect(result.runsUsed).toBe(3)
  })

  it('returns runsUsed=0 when user row is missing', async () => {
    mockGetUserApiKeys.mockResolvedValue([])
    mockUserFindUnique.mockResolvedValue(null as never)

    const result = await checkDemoEligibility(USER_ID, IP)
    expect(result.runsUsed).toBe(0)
  })

  it('uses DEMO_RUNS_MAX = 5', () => {
    expect(DEMO_RUNS_MAX).toBe(5)
  })
})

describe('claimDemoRun', () => {
  it('returns claimed=true and incremented runsUsed on success', async () => {
    mockUserUpdateMany.mockResolvedValue({ count: 1 } as never)
    mockUserFindUnique.mockResolvedValue({ demoRunsUsed: 1 } as never)

    const result = await claimDemoRun(USER_ID)
    expect(result.claimed).toBe(true)
    expect(result.runsUsed).toBe(1)
  })

  it('returns claimed=false when updateMany matches 0 rows (race condition)', async () => {
    mockUserUpdateMany.mockResolvedValue({ count: 0 } as never)

    const result = await claimDemoRun(USER_ID)
    expect(result.claimed).toBe(false)
    expect(result.runsUsed).toBe(DEMO_RUNS_MAX)
  })

  it('calls updateMany with WHERE demoRunsUsed < DEMO_RUNS_MAX guard', async () => {
    mockUserUpdateMany.mockResolvedValue({ count: 1 } as never)
    mockUserFindUnique.mockResolvedValue({ demoRunsUsed: 1 } as never)

    await claimDemoRun(USER_ID)

    expect(mockUserUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: USER_ID,
          demoRunsUsed: { lt: DEMO_RUNS_MAX },
        }),
      })
    )
  })
})
