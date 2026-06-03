import { describe, it, expect, beforeEach } from 'vitest'
import { encrypt, decrypt } from '@/lib/server/encryption'

describe('encryption', () => {
  describe('encrypt / decrypt roundtrip', () => {
    it('decrypts back to the original plaintext', () => {
      const plain = 'sk-ant-api03-supersecretkey'
      expect(decrypt(encrypt(plain))).toBe(plain)
    })

    it('works with short strings', () => {
      expect(decrypt(encrypt('x'))).toBe('x')
    })

    it('works with special characters and unicode', () => {
      const plain = 'sk-test-🔑-abc/+=='
      expect(decrypt(encrypt(plain))).toBe(plain)
    })
  })

  describe('encrypt', () => {
    it('produces hex:hex format (iv:ciphertext)', () => {
      const enc = encrypt('hello')
      expect(enc).toMatch(/^[0-9a-f]{32}:[0-9a-f]+$/)
    })

    it('uses a random IV — two encryptions of the same plaintext differ', () => {
      const plain = 'same-key'
      expect(encrypt(plain)).not.toBe(encrypt(plain))
    })

    it('produces different ciphertext for different plaintexts', () => {
      expect(encrypt('key-a')).not.toBe(encrypt('key-b'))
    })
  })

  describe('decrypt', () => {
    it('throws on malformed input (missing colon separator)', () => {
      expect(() => decrypt('notvalidhex')).toThrow()
    })

    it('throws when ciphertext is tampered with', () => {
      const enc = encrypt('original')
      const [iv, ct] = enc.split(':')
      expect(() => decrypt(`${iv}:${ct.slice(0, -2)}ff`)).toThrow()
    })
  })

  describe('ENCRYPTION_KEY validation', () => {
    const originalKey = process.env.ENCRYPTION_KEY

    beforeEach(() => {
      process.env.ENCRYPTION_KEY = originalKey
    })

    it('throws when ENCRYPTION_KEY is missing', () => {
      delete process.env.ENCRYPTION_KEY
      expect(() => encrypt('x')).toThrow(/ENCRYPTION_KEY/)
    })

    it('throws when ENCRYPTION_KEY is the wrong length', () => {
      process.env.ENCRYPTION_KEY = 'tooshort'
      expect(() => encrypt('x')).toThrow(/ENCRYPTION_KEY/)
    })
  })
})
