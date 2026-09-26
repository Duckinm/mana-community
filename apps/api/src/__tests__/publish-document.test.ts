import { describe, it, expect, afterEach, mock } from 'bun:test'
import { db } from '@api/db'
import { users, documents, documentItems, emailLogs, activityLogs } from '@mana/db'
import { eq } from 'drizzle-orm'
import type { SendDocumentEmailResult } from '@api/modules/documents/send-email'

const sendDocumentEmailMock = mock(async (): Promise<SendDocumentEmailResult> => ({ status: 'sent', sentAt: new Date().toISOString() }))

mock.module('../modules/documents/send-email', () => ({
  sendDocumentEmail: sendDocumentEmailMock,
}))

const { publishDocument } = await import('@api/modules/documents/publication')

async function createUser() {
  const [user] = await db
    .insert(users)
    .values({ name: 'Test User', email: `test-${crypto.randomUUID()}@example.com` })
    .returning()
  return user
}

async function createDraftDocument(userId: string, overrides: Partial<typeof documents.$inferInsert> = {}) {
  const [doc] = await db
    .insert(documents)
    .values({
      userId,
      type: 'INV',
      status: 'draft',
      number: 'INV-TEST-001',
      issueDate: '2026-06-01',
      amountDueCents: 100000,
      totalCents: 100000,
      clientEmail: 'billing@acme.com',
      ...overrides,
    })
    .returning()

  await db.insert(documentItems).values({
    documentId: doc.id,
    description: 'Design work',
    quantity: 100,
    unitPriceCents: 100000,
    subtotalCents: 100000,
    position: 0,
  })

  return doc
}

const createdUserIds: string[] = []

afterEach(async () => {
  sendDocumentEmailMock.mockClear()
  for (const userId of createdUserIds.splice(0)) {
    await db.delete(activityLogs).where(eq(activityLogs.userId, userId))
    await db.delete(emailLogs).where(eq(emailLogs.userId, userId))
    const docs = await db.select().from(documents).where(eq(documents.userId, userId))
    for (const doc of docs) {
      await db.delete(documentItems).where(eq(documentItems.documentId, doc.id))
    }
    await db.delete(documents).where(eq(documents.userId, userId))
    await db.delete(users).where(eq(users.id, userId))
  }
})

describe('publishDocument', () => {
  it('with sendEmail true, publishes the document and sends the email', async () => {
    const user = await createUser()
    createdUserIds.push(user.id)
    const doc = await createDraftDocument(user.id)

    const result = await publishDocument(user.id, doc.id, { sendEmail: true })

    expect(result.document.status).toBe('published')
    expect(result.emailStatus).toBe('sent')
    expect(sendDocumentEmailMock).toHaveBeenCalledTimes(1)

    const [activity] = await db.select().from(activityLogs).where(eq(activityLogs.entityId, doc.id))
    expect(activity.action).toBe('published')
    expect(activity.summaryKey).toBe('activity:document.published')
    expect(JSON.parse(activity.summaryParams!)).toEqual({ type: 'INV', number: 'INV-TEST-001' })
  })

  it('with sendEmail true but no clientEmail, publishes without sending and omits emailStatus', async () => {
    const user = await createUser()
    createdUserIds.push(user.id)
    const doc = await createDraftDocument(user.id, { clientEmail: null })

    const result = await publishDocument(user.id, doc.id, { sendEmail: true })

    expect(result.document.status).toBe('published')
    expect(result.emailStatus).toBeUndefined()
    expect(sendDocumentEmailMock).not.toHaveBeenCalled()
  })

  it('with sendEmail false or omitted, publishes without sending', async () => {
    const user = await createUser()
    createdUserIds.push(user.id)
    const doc = await createDraftDocument(user.id)

    const result = await publishDocument(user.id, doc.id)

    expect(result.document.status).toBe('published')
    expect(result.emailStatus).toBeUndefined()
    expect(sendDocumentEmailMock).not.toHaveBeenCalled()
  })

  it('succeeds even when the email send fails, returning emailStatus failed', async () => {
    sendDocumentEmailMock.mockImplementationOnce(async () => ({ status: 'failed' as const, sentAt: null }))

    const user = await createUser()
    createdUserIds.push(user.id)
    const doc = await createDraftDocument(user.id)

    const result = await publishDocument(user.id, doc.id, { sendEmail: true })

    expect(result.document.status).toBe('published')
    expect(result.emailStatus).toBe('failed')
  })
})
