import { afterEach, describe, expect, it } from 'bun:test'
import { eq } from 'drizzle-orm'
import { users, documents, paymentSlips, storageFiles, transactions, activityLogs } from '@mana/db'
import { db } from '@api/db'
import { env } from '@api/env'
import { confirmPaymentSlip } from '@api/modules/payment-slips/service'
import { ConflictError } from '@api/lib/errors'

async function createUser() {
  const [user] = await db
    .insert(users)
    .values({ name: 'Slip Gating Test User', email: `slip-gating-${crypto.randomUUID()}@example.com` })
    .returning()
  return user
}

async function createDocument(userId: string) {
  const [doc] = await db
    .insert(documents)
    .values({
      userId,
      type: 'INV',
      status: 'published',
      number: `INV-SLIP-${crypto.randomUUID().slice(0, 8)}`,
      amountDueCents: 10000,
      totalCents: 10000,
    })
    .returning()
  return doc
}

async function createStorageFile(userId: string) {
  const [file] = await db
    .insert(storageFiles)
    .values({
      userId,
      name: 'slip.jpg',
      kind: 'document',
      sizeBytes: 1,
      mimeType: 'image/jpeg',
      r2Key: `tests/${crypto.randomUUID()}/slip.jpg`,
    })
    .returning()
  return file
}

async function createSlip(documentId: string, fileId: string) {
  const [slip] = await db
    .insert(paymentSlips)
    .values({
      documentId,
      fileId,
      source: 'owner',
      status: 'proposed',
      extractedAmountCents: 10000,
      extractedDate: '2026-06-01',
      extractedCurrency: 'THB',
      apiVerified: false,
    })
    .returning()
  return slip
}

const createdUserIds: string[] = []
const originalThunderKey = env.THUNDER_API_KEY

afterEach(async () => {
  env.THUNDER_API_KEY = originalThunderKey
  for (const userId of createdUserIds.splice(0)) {
    await db.delete(activityLogs).where(eq(activityLogs.userId, userId))
    await db.delete(transactions).where(eq(transactions.userId, userId))
    await db.delete(documents).where(eq(documents.userId, userId)) // cascades payment_slips
    await db.delete(storageFiles).where(eq(storageFiles.userId, userId))
    await db.delete(users).where(eq(users.id, userId))
  }
})

describe('confirmPaymentSlip verification gating', () => {
  it('rejects an unverified slip with 409 SLIP_UNVERIFIED when Thunder is configured and no override is given', async () => {
    env.THUNDER_API_KEY = 'test-thunder-key'
    const user = await createUser()
    createdUserIds.push(user.id)
    const doc = await createDocument(user.id)
    const file = await createStorageFile(user.id)
    const slip = await createSlip(doc.id, file.id)

    let caught: unknown
    try {
      await confirmPaymentSlip(user.id, doc.id, slip.id)
    } catch (err) {
      caught = err
    }

    expect(caught).toBeInstanceOf(ConflictError)
    expect((caught as ConflictError).statusCode).toBe(409)
    expect((caught as ConflictError).code).toBe('SLIP_UNVERIFIED')

    const [unchanged] = await db.select().from(paymentSlips).where(eq(paymentSlips.id, slip.id))
    expect(unchanged.status).toBe('proposed')
  })

  it('proceeds and confirms an unverified slip when allowUnverified is true', async () => {
    env.THUNDER_API_KEY = 'test-thunder-key'
    const user = await createUser()
    createdUserIds.push(user.id)
    const doc = await createDocument(user.id)
    const file = await createStorageFile(user.id)
    const slip = await createSlip(doc.id, file.id)

    const result = await confirmPaymentSlip(user.id, doc.id, slip.id, true)
    expect(result.transaction).toBeDefined()

    const [confirmed] = await db.select().from(paymentSlips).where(eq(paymentSlips.id, slip.id))
    expect(confirmed.status).toBe('confirmed')
  })
})
