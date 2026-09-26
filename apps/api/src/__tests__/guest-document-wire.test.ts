import { describe, expect, it } from 'bun:test'
import type { documents, documentItems } from '@mana/db'
import { documentToGuestWire } from '@api/modules/documents/wire'

type DocumentRow = typeof documents.$inferSelect
type DocumentItemRow = typeof documentItems.$inferSelect

function fakeDocument(): DocumentRow {
  return {
    id: 'doc_1',
    userId: 'SECRET_USER_ID',
    type: 'INV',
    status: 'published',
    number: 'INV-0001',
    projectId: 'SECRET_PROJECT_ID',
    contactId: 'SECRET_CONTACT_ID',
    currency: 'THB',
    documentLanguage: 'th',
    subtotalCents: 10000,
    discountCents: 0,
    taxRateBps: 700,
    taxCents: 700,
    whtRateBps: 0,
    whtCents: 0,
    totalCents: 10700,
    amountDueCents: 10700,
    issueDate: '2026-06-01',
    dueDate: '2026-06-15',
    validUntilDate: 'SECRET_VALID_UNTIL',
    paymentTermsText: 'SECRET_PAYMENT_TERMS',
    sentAt: new Date('2026-06-01T00:00:00.000Z'),
    clientStatus: 'approved',
    clientApprovedAt: new Date('2026-06-02T00:00:00.000Z'),
    clientApprovalIp: 'SECRET_CLIENT_IP',
    paidAt: null,
    whtCertNumber: 'SECRET_WHT_CERT',
    senderProfileId: null,
    vatRegistered: true,
    registeredName: 'Acme Freelance',
    registeredNameEn: 'SECRET_REGISTERED_NAME_EN',
    yourEmail: 'me@example.com',
    yourPhone: '0800000000',
    registeredAddress: '1 Main St',
    registeredAddressEn: 'SECRET_REGISTERED_ADDRESS_EN',
    yourCountry: 'TH',
    yourZip: '10110',
    yourTaxId: '1234567890123',
    yourBranchNumber: '00000',
    yourLogo: null,
    signatureImage: null,
    signatureEnabled: true,
    signaturePlacement: 'right',
    clientName: 'Client Co',
    clientNameTh: 'SECRET_CLIENT_NAME_TH',
    clientEmail: 'client@example.com',
    clientPhone: '0811111111',
    clientAddress: '2 Client Rd',
    clientAddressTh: 'SECRET_CLIENT_ADDRESS_TH',
    clientCountry: 'TH',
    clientZip: '10120',
    clientTaxId: '3210987654321',
    clientBranchNumber: '00001',
    bankName: 'Test Bank',
    accountNumber: '1112223334',
    accountName: 'Acme Freelance',
    swiftCode: 'TESTTHBK',
    promptPayId: '0800000000',
    cardNumber: '4111111111111111',
    cardExpiry: '12/30',
    cardholderName: 'Acme Freelance',
    remark: 'Thanks for your business',
    pdfR2Key: 'SECRET_PDF_R2_KEY',
    pdfFailedAt: null,
    publicToken: 'SECRET_PUBLIC_TOKEN',
    publicAccessRevokedAt: null,
    publicAccessRotatedAt: null,
    viewedAt: new Date('2026-06-03T00:00:00.000Z'),
    parentDocumentId: 'SECRET_PARENT_DOCUMENT_ID',
    isRecurring: true,
    recurringInterval: 'monthly',
    nextGenerationDate: '2026-07-01',
    createdAt: new Date('2026-05-01T00:00:00.000Z'),
    updatedAt: new Date('2026-05-02T00:00:00.000Z'),
    deletedAt: null,
  }
}

function fakeItem(): DocumentItemRow {
  return {
    id: 'item_1',
    documentId: 'doc_1',
    description: 'Consulting',
    quantity: 100,
    unitPriceCents: 10000,
    subtotalCents: 10000,
    position: 0,
  }
}

const FORBIDDEN_KEYS = [
  'userId', 'senderProfileId', 'projectId', 'contactId', 'validUntilDate', 'paymentTermsText', 'sentAt',
  'clientApprovalIp', 'whtCertNumber', 'vatRegistered', 'registeredNameEn', 'registeredAddressEn',
  'clientNameTh', 'clientAddressTh', 'pdfR2Key', 'pdfFailedAt', 'publicToken', 'viewedAt',
  'publicAccessRevokedAt', 'publicAccessRotatedAt',
  'parentDocumentId', 'isRecurring', 'recurringInterval', 'nextGenerationDate',
  'createdAt', 'updatedAt', 'deletedAt',
] as const

describe('documentToGuestWire', () => {
  it('never leaks owner-only or internal fields to the public/guest payload', async () => {
    const result = await documentToGuestWire(fakeDocument(), [fakeItem()], [], null, false, true)

    for (const key of FORBIDDEN_KEYS) {
      expect(result).not.toHaveProperty(key)
    }
  })

  it('keeps payment-instruction fields (bank + card) so a guest can see how to pay', async () => {
    const result = await documentToGuestWire(fakeDocument(), [fakeItem()], [], null, false, true)

    expect(result.bankName).toBe('Test Bank')
    expect(result.accountNumber).toBe('1112223334')
    expect(result.cardNumber).toBe('4111111111111111')
    expect(result.cardExpiry).toBe('12/30')
    expect(result.cardholderName).toBe('Acme Freelance')
  })

  it('passes through allow-listed display fields and transforms timestamps to ISO strings', async () => {
    const result = await documentToGuestWire(fakeDocument(), [fakeItem()], [], null, true, true)

    expect(result.id).toBe('doc_1')
    expect(result.clientName).toBe('Client Co')
    expect(result.isOwner).toBe(true)
    expect(result.clientApprovedAt).toBe('2026-06-02T00:00:00.000Z')
    expect(result.yourLogo).toBeNull()
    expect(result.signatureImage).toBeNull()
  })

  it('strips internal item fields (documentId, position) from guest line items', async () => {
    const result = await documentToGuestWire(fakeDocument(), [fakeItem()], [], null, false, true)

    expect(result.items).toHaveLength(1)
    expect(result.items[0]).not.toHaveProperty('documentId')
    expect(result.items[0]).not.toHaveProperty('position')
    expect(result.items[0]).toMatchObject({
      id: 'item_1',
      description: 'Consulting',
      quantity: 100,
      unitPriceCents: 10000,
      subtotalCents: 10000,
    })
  })
})
