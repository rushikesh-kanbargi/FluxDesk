import { describe, it, expect, vi, afterEach } from 'vitest'
import { logger } from '@/lib/server/logger'

afterEach(() => {
  vi.restoreAllMocks()
})

describe('logger (dev mode — NODE_ENV=test)', () => {
  it('logger.info calls console.log', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
    logger.info('hello')
    expect(spy).toHaveBeenCalledOnce()
    expect(spy.mock.calls[0][0]).toContain('hello')
  })

  it('logger.error calls console.error', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    logger.error('something failed')
    expect(spy).toHaveBeenCalledOnce()
  })

  it('logger.warn calls console.warn', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    logger.warn('watch out')
    expect(spy).toHaveBeenCalledOnce()
  })

  it('logger.debug calls console.log in dev', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
    logger.debug('debug msg')
    expect(spy).toHaveBeenCalledOnce()
  })

  it('logger.info passes meta through', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
    logger.info('with meta', { userId: 'u1' })
    expect(spy).toHaveBeenCalledOnce()
  })
})
