import { describe, it, expect, afterEach, mock } from 'bun:test'
import { buildDocumentEmailHtml } from '@api/utils/email/document-email'
import type { EmailResult } from '@api/utils/email'
import { db } from '@api/db'
import { users, documents, emailLogs, activityLogs } from '@mana/db'
import { eq } from 'drizzle-orm'

function makeDocument(overrides: Partial<typeof documents.$inferSelect> = {}): typeof documents.$inferSelect {
  return {
    id: 'doc-1',
    userId: 'user-1',
    type: 'INV',
    status: 'published',
    number: 'INV-0042',
    projectId: null,
    contactId: null,
    currency: 'THB',
    documentLanguage: 'th',
    subtotalCents: 1500000,
    discountCents: 0,
    taxRateBps: 0,
    taxCents: 0,
    whtRateBps: 0,
    whtCents: 0,
    totalCents: 1500000,
    amountDueCents: 1500000,
    issueDate: '2026-06-01',
    dueDate: '2026-07-01',
    validUntilDate: null,
    paymentTermsText: null,
    sentAt: null,
    clientStatus: null,
    clientApprovedAt: null,
    clientApprovalIp: null,
    paidAt: null,
    whtCertNumber: null,
    senderProfileId: null,
    vatRegistered: false,
    registeredName: 'Jane Designer',
    registeredNameEn: null,
    yourEmail: 'jane@example.com',
    yourPhone: null,
    registeredAddress: null,
    registeredAddressEn: null,
    yourCountry: null,
    yourZip: null,
    yourTaxId: null,
    yourBranchNumber: null,
    yourLogo: null,
    signatureImage: null,
    signatureEnabled: false,
    signaturePlacement: null,
    clientName: 'Acme Co',
    clientNameTh: null,
    clientEmail: 'billing@acme.com',
    clientPhone: null,
    clientAddress: null,
    clientAddressTh: null,
    clientCountry: null,
    clientZip: null,
    clientTaxId: null,
    clientBranchNumber: null,
    bankName: null,
    accountNumber: null,
    accountName: null,
    swiftCode: null,
    promptPayId: null,
    cardNumber: null,
    cardExpiry: null,
    cardholderName: null,
    remark: null,
    pdfR2Key: null,
    pdfFailedAt: null,
    publicToken: 'abc-123-token',
    publicAccessRevokedAt: null,
    publicAccessRotatedAt: null,
    viewedAt: null,
    parentDocumentId: null,
    isRecurring: false,
    recurringInterval: null,
    nextGenerationDate: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    ...overrides,
  }
}

describe('buildDocumentEmailHtml', () => {
  it('builds a subject and html for an invoice with amount due, due date, and view link', async () => {
    const doc = makeDocument({ type: 'INV', number: 'INV-0042', amountDueCents: 1500000, dueDate: '2026-07-01' })
    const viewUrl = 'http://localhost:3000/view/abc-123-token'

    const { subject, html } = await buildDocumentEmailHtml(doc, viewUrl)

    expect(subject).toContain('Invoice')
    expect(subject).toContain('INV-0042')
    expect(html).toContain('Acme Co')
    expect(html).toContain(viewUrl)
    expect(html).toContain('15,000.00')
    expect(html).toContain('1 July 2026')
  })

  it('builds a subject for a quotation', async () => {
    const doc = makeDocument({ type: 'QO', number: 'QO-0012' })
    const { subject } = await buildDocumentEmailHtml(doc, 'http://localhost:3000/view/abc-123-token')

    expect(subject).toContain('Quotation')
    expect(subject).toContain('QO-0012')
  })

  it('builds a subject and html with the paid date for a receipt', async () => {
    const doc = makeDocument({ type: 'RC', number: 'RC-0007', paidAt: '2026-06-10' })
    const { subject, html } = await buildDocumentEmailHtml(doc, 'http://localhost:3000/view/abc-123-token')

    expect(subject).toContain('Receipt')
    expect(subject).toContain('RC-0007')
    expect(html).toContain('10 June 2026')
  })
})

const sendEmailBatchMock = mock(async (): Promise<EmailResult[]> => [{ to: 'billing@acme.com', status: 'sent', resendId: 'resend-123' }])

mock.module('../utils/email', () => ({
  sendEmailBatch: sendEmailBatchMock,
}))

const { sendDocumentEmail } = await import('@api/modules/documents/send-email')

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

describe('sendDocumentEmail', () => {
  it('on provider acceptance, logs email_logs and waits for delivery before updating sentAt', async () => {
    const user = await createUser()
    createdUserIds.push(user.id)
    const doc = await createDocument(user.id)

    const result = await sendDocumentEmail(user.id, doc.id)

    expect(result.status).toBe('sent')
    expect(result.sentAt).toBeNull()

    const [log] = await db.select().from(emailLogs).where(eq(emailLogs.referenceId, doc.id))
    expect(log.type).toBe('document_sent')
    expect(log.recipient).toBe('billing@acme.com')
    expect(log.status).toBe('sent')
    expect(log.resendId).toBe('resend-123')

    const [refetchedDoc] = await db.select().from(documents).where(eq(documents.id, doc.id))
    expect(refetchedDoc.sentAt).toBeNull()

    const activities = await db.select().from(activityLogs).where(eq(activityLogs.entityId, doc.id))
    expect(activities).toHaveLength(0)
  })

  it('on blocked (sandbox), logs email_logs as blocked without updating sentAt or activity log', async () => {
    sendEmailBatchMock.mockImplementationOnce(async () => [{ to: 'billing@acme.com', status: 'blocked' as const }])

    const user = await createUser()
    createdUserIds.push(user.id)
    const doc = await createDocument(user.id)

    const result = await sendDocumentEmail(user.id, doc.id)

    expect(result.status).toBe('blocked')
    expect(result.sentAt).toBeNull()

    const [log] = await db.select().from(emailLogs).where(eq(emailLogs.referenceId, doc.id))
    expect(log.status).toBe('blocked')

    const [refetchedDoc] = await db.select().from(documents).where(eq(documents.id, doc.id))
    expect(refetchedDoc.sentAt).toBeNull()

    const activities = await db.select().from(activityLogs).where(eq(activityLogs.entityId, doc.id))
    expect(activities).toHaveLength(0)
  })

  it('on failed send, logs email_logs as failed without updating sentAt or activity log', async () => {
    sendEmailBatchMock.mockImplementationOnce(async () => [{ to: 'billing@acme.com', status: 'failed' as const, error: 'Resend API error' }])

    const user = await createUser()
    createdUserIds.push(user.id)
    const doc = await createDocument(user.id)

    const result = await sendDocumentEmail(user.id, doc.id)

    expect(result.status).toBe('failed')
    expect(result.sentAt).toBeNull()

    const [log] = await db.select().from(emailLogs).where(eq(emailLogs.referenceId, doc.id))
    expect(log.status).toBe('failed')

    const [refetchedDoc] = await db.select().from(documents).where(eq(documents.id, doc.id))
    expect(refetchedDoc.sentAt).toBeNull()

    const activities = await db.select().from(activityLogs).where(eq(activityLogs.entityId, doc.id))
    expect(activities).toHaveLength(0)
  })

  it('with no client email, returns no_client_email without calling sendEmailBatch or writing email_logs', async () => {
    const user = await createUser()
    createdUserIds.push(user.id)
    const doc = await createDocument(user.id, { clientEmail: null })

    const result = await sendDocumentEmail(user.id, doc.id)

    expect(result.status).toBe('no_client_email')
    expect(sendEmailBatchMock).not.toHaveBeenCalled()

    const logs = await db.select().from(emailLogs).where(eq(emailLogs.referenceId, doc.id))
    expect(logs).toHaveLength(0)
  })
})
