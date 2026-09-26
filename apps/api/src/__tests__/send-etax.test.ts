import { describe, it, expect, afterEach, mock } from 'bun:test'
import type { EmailResult, SingleEmailPayload } from '@api/utils/email'
import { db } from '@api/db'
import { users, documents, emailLogs, senderProfiles } from '@mana/db'
import { eq } from 'drizzle-orm'

const sendEmailSingleMock = mock(
  async (_payload: SingleEmailPayload): Promise<EmailResult> => ({ to: 'billing@acme.com', status: 'sent', resendId: 'resend-etax-1' }),
)

mock.module('../utils/email', () => ({
  sendEmailSingle: sendEmailSingleMock,
}))

let oversizePdf = false

mock.module('../utils/pdf/pdfa', () => ({
  convertToPdfA3: mock(async (pdf: Buffer) => (oversizePdf ? Buffer.alloc(4 * 1024 * 1024) : pdf)),
}))

mock.module('@api/utils/r2', () => {
  const r2 = { send: mock(async () => ({ Body: { transformToByteArray: async () => new Uint8Array([1, 2, 3]) } })) }
  return { r2, r2Presigner: r2, R2_BUCKET: 'test-bucket' }
})

const { sendDocumentEtax, etaxFromEmail, formatEtaxSubject } = await import('@api/modules/documents/send-etax')

async function createUser(region: 'TH' | 'US' | null = 'TH') {
  const [user] = await db
    .insert(users)
    .values({ name: 'Test User', email: `test-${crypto.randomUUID()}@example.com`, region })
    .returning()
  return user
}

async function createSenderProfile(userId: string, overrides: Partial<typeof senderProfiles.$inferInsert> = {}) {
  const [profile] = await db
    .insert(senderProfiles)
    // vatRegistered: only a VAT registrant may issue a tax invoice, so the send gate
    // requires it alongside etaxEnabled
    .values({ userId, name: 'Default', isDefault: true, registeredName: 'Acme Co Ltd', etaxEnabled: true, vatRegistered: true, ...overrides })
    .returning()
  return profile
}

async function createDocument(userId: string, overrides: Partial<typeof documents.$inferInsert> = {}) {
  const [doc] = await db
    .insert(documents)
    .values({
      userId,
      type: 'INV',
      status: 'published',
      number: 'INV-TEST-001',
      registeredName: 'Acme Co Ltd',
      issueDate: '2026-07-27',
      amountDueCents: 100000,
      totalCents: 100000,
      clientEmail: 'billing@acme.com',
      clientName: 'Acme Co',
      pdfR2Key: 'documents/doc-1/invoice.pdf',
      ...overrides,
    })
    .returning()
  return doc
}

const createdUserIds: string[] = []

afterEach(async () => {
  sendEmailSingleMock.mockClear()
  oversizePdf = false
  for (const userId of createdUserIds.splice(0)) {
    await db.delete(emailLogs).where(eq(emailLogs.userId, userId))
    await db.delete(documents).where(eq(documents.userId, userId))
    await db.delete(senderProfiles).where(eq(senderProfiles.userId, userId))
    await db.delete(users).where(eq(users.id, userId))
  }
})

describe('etaxFromEmail', () => {
  it('is deterministic and derived from the first 8 chars of the userId', () => {
    expect(etaxFromEmail('abcdefgh12345')).toBe('etax-abcdefgh@heymana.app')
  })
})

describe('formatEtaxSubject', () => {
  it('matches the ETDA strict format [dd/mm/yyyy][INV][documentNumber] with a Buddhist-Era year', () => {
    expect(formatEtaxSubject('INV-TEST-001', '2026-07-27')).toBe('[27/07/2569][INV][INV-TEST-001]')
  })

  it("reproduces etax.teda.th's own example", () => {
    expect(formatEtaxSubject('101/2559', '2016-08-01')).toBe('[01/08/2559][INV][101/2559]')
  })
})

describe('sendDocumentEtax', () => {
  it('refuses to send when the user region is outside Thailand', async () => {
    const user = await createUser('US')
    createdUserIds.push(user.id)
    await createSenderProfile(user.id)
    const doc = await createDocument(user.id)

    const result = await sendDocumentEtax(user.id, doc.id)

    expect(result.status).toBe('region_not_supported')
    expect(sendEmailSingleMock).not.toHaveBeenCalled()
  })

  it('refuses to send when the user region is unset', async () => {
    const user = await createUser(null)
    createdUserIds.push(user.id)
    const doc = await createDocument(user.id)

    const result = await sendDocumentEtax(user.id, doc.id)

    expect(result.status).toBe('region_not_supported')
    expect(sendEmailSingleMock).not.toHaveBeenCalled()
  })

  it('sends the invoice as a single PDF/A-3 attachment cc\'d to ETDA', async () => {
    const user = await createUser()
    createdUserIds.push(user.id)
    await createSenderProfile(user.id)
    const doc = await createDocument(user.id)

    const result = await sendDocumentEtax(user.id, doc.id)

    expect(result.status).toBe('sent')
    expect(sendEmailSingleMock).toHaveBeenCalledTimes(1)
    const payload = sendEmailSingleMock.mock.calls[0][0]
    expect(payload.cc).toBe('csemail@etax.teda.th')
    expect(payload.attachments?.length).toBe(1)
    expect(payload.from).toContain(etaxFromEmail(user.id))
  })

  it('refuses a profile that opted in but is not VAT registered', async () => {
    const user = await createUser()
    createdUserIds.push(user.id)
    await createSenderProfile(user.id, { vatRegistered: false })
    const doc = await createDocument(user.id)

    const result = await sendDocumentEtax(user.id, doc.id)

    expect(result.status).toBe('not_enabled')
  })

  it('resolves the profile by senderProfileId even when another profile shares the registered name', async () => {
    const user = await createUser()
    createdUserIds.push(user.id)
    await createSenderProfile(user.id, { name: 'Opted in', isDefault: true, etaxEnabled: true })
    const optedOut = await createSenderProfile(user.id, { name: 'Opted out', isDefault: false, etaxEnabled: false })
    const doc = await createDocument(user.id, { senderProfileId: optedOut.id })

    const result = await sendDocumentEtax(user.id, doc.id)

    expect(result.status).toBe('not_enabled')
  })

  it('falls back to the registered-name match for documents created before senderProfileId existed', async () => {
    const user = await createUser()
    createdUserIds.push(user.id)
    await createSenderProfile(user.id, { name: 'Other', isDefault: true, registeredName: 'Other Co', etaxEnabled: false })
    await createSenderProfile(user.id, { name: 'Acme', isDefault: false, registeredName: 'Acme Co Ltd', etaxEnabled: true })
    const doc = await createDocument(user.id, { senderProfileId: null })

    const result = await sendDocumentEtax(user.id, doc.id)

    expect(result.status).toBe('sent')
  })

  it('refuses to send an attachment over the 3 MB ETDA limit', async () => {
    const user = await createUser()
    createdUserIds.push(user.id)
    await createSenderProfile(user.id)
    const doc = await createDocument(user.id)
    oversizePdf = true

    const result = await sendDocumentEtax(user.id, doc.id)

    expect(result.status).toBe('attachment_too_large')
    expect(sendEmailSingleMock).not.toHaveBeenCalled()
  })

  it('returns not_enabled when the sender profile has not opted in', async () => {
    const user = await createUser()
    createdUserIds.push(user.id)
    await createSenderProfile(user.id, { etaxEnabled: false })
    const doc = await createDocument(user.id)

    const result = await sendDocumentEtax(user.id, doc.id)

    expect(result.status).toBe('not_enabled')
  })

  it('returns wrong_document_type for non-INV documents', async () => {
    const user = await createUser()
    createdUserIds.push(user.id)
    await createSenderProfile(user.id)
    const doc = await createDocument(user.id, { type: 'QO' })

    const result = await sendDocumentEtax(user.id, doc.id)

    expect(result.status).toBe('wrong_document_type')
  })

  it('returns pdf_not_ready when the PDF has not finished generating', async () => {
    const user = await createUser()
    createdUserIds.push(user.id)
    await createSenderProfile(user.id)
    const doc = await createDocument(user.id, { pdfR2Key: null })

    const result = await sendDocumentEtax(user.id, doc.id)

    expect(result.status).toBe('pdf_not_ready')
  })
})
