/**
 * Migration: Re-encrypt API keys from base64 to AES-256-CBC
 *
 * Run ONCE after deploying the encryption fix:
 *   cd frontend && npx ts-node scripts/migrate-api-keys.ts
 *
 * Prerequisites:
 *   - ENCRYPTION_KEY env var set (64-char hex)
 *   - DATABASE_URL env var set
 */
import { PrismaClient } from '@prisma/client'
import { encrypt } from '../src/lib/server/encryption'

const prisma = new PrismaClient()

async function migrate() {
  // Find all active API key records
  const apiKeys = await prisma.apiKey.findMany({
    where: { isActive: true },
    select: { id: true, keyHash: true, userId: true, provider: true },
  })

  console.log(`Found ${apiKeys.length} active API keys`)

  for (const key of apiKeys) {
    if (!key.keyHash) continue

    // Check if already AES-encrypted (contains ':' separator from iv:ciphertext format)
    if (key.keyHash.includes(':')) {
      console.log(`ApiKey ${key.id} (user ${key.userId}, ${key.provider}): already migrated, skipping`)
      continue
    }

    // Decode base64 to get plaintext key, then re-encrypt with AES
    const plaintext = Buffer.from(key.keyHash, 'base64').toString('utf-8')
    const encrypted = encrypt(plaintext)

    await prisma.apiKey.update({
      where: { id: key.id },
      data: { keyHash: encrypted },
    })

    console.log(`ApiKey ${key.id} (user ${key.userId}, ${key.provider}): migrated`)
  }

  console.log('Migration complete')
  await prisma.$disconnect()
}

migrate().catch((err) => {
  console.error(err)
  process.exit(1)
})
