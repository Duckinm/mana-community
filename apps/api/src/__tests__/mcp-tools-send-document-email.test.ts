import { describe, it, expect, afterEach, mock } from 'bun:test'
import type { EmailResult } from '@api/utils/email'
import { db } from '@api/db'
import { users, documents, emailLogs, activityLogs } from '@mana/db'
import { eq } from 'drizzle-orm'

const sendEmailBatchMock = mock(async (): Promise<EmailResult[]> => [{ to: 'billing@acme.com', status: 'sent', resendId: 'resend-123' }])

mock.module('../utils/email', () => ({
  sendEmailBatch: sendEmailBatchMock,
}))

const { documentHandlers } = await import('@api/utils/mcp-tools/documents')

async function createUser() {
  const [user] = await db
    .insert(users)
    .values({ name: 'Test User', email: `test-${crypto.randomUUID()}@example.com` })
    .returning()
  return user
}

async function createDocument(userId: string, overrides: Partial<typeof documents.$inferInsert> = {}) {
  const [doc] = await db
    .insert(documents)
    .values({
      userId,
      type: 'INV',
      status: 'published',
      number: 'INV-TEST-001',
      amountDueCents: 100000,
      totalCents: 100000,
      clientEmail: 'billing@acme.com',
      clientName: 'Acme Co',
      ...overrides,
    })
    .returning()
  return doc
}

const createdUserIds: string[] = []

afterEach(async () => {
  sendEmailBatchMock.mockClear()
  for (const userId of createdUserIds.splice(0)) {
    await db.delete(activityLogs).where(eq(activityLogs.userId, userId))
    await db.delete(emailLogs).where(eq(emailLogs.userId, userId))
    await db.delete(documents).where(eq(documents.userId, userId))
    await db.delete(users).where(eq(users.id, userId))
  }
})

describe('send_document_email', () => {
  it('on provider acceptance, returns status and waits for delivery before sentAt', async () => {
    const user = await createUser()
    createdUserIds.push(user.id)
    const doc = await createDocument(user.id)

    const result = (await documentHandlers['send_document_email'](user.id, { documentId: doc.id })) as { status: string; sentAt: Date | null }

    expect(result.status).toBe('sent')
    expect(result.sentAt).toBeNull()
  })

  it('returns a relayable message when the document has no client email', async () => {
    const user = await createUser()
    createdUserIds.push(user.id)
    const doc = await createDocument(user.id, { clientEmail: null })

    const result = (await documentHandlers['send_document_email'](user.id, { documentId: doc.id })) as { message: string }

    expect(result.message).toBe('This document has no client email on file')
  })

  it('throws when documentId is missing', async () => {
    const user = await createUser()
    createdUserIds.push(user.id)

    await expect(documentHandlers['send_document_email'](user.id, {})).rejects.toThrow()
  })
})
