import { createInsertSchema, createUpdateSchema } from 'drizzle-typebox'
import { t } from 'elysia'
import { documents, documentItems } from '@mana/db'

const _documentItemInsert = createInsertSchema(documentItems, {
  description: t.String(),
  // Fixed-point ×100 on the wire, so whole units means a multiple of 100.
  quantity: t.Integer({ minimum: 100, multipleOf: 100 }),
  unitPriceCents: t.Number(),
  position: t.Number(),
})
export const DocumentItemBody = t.Pick(_documentItemInsert, [
  'description',
  'quantity',
  'unitPriceCents',
  'position',
])

const RecurringInterval = t.Union([
  t.Literal('monthly'),
  t.Literal('quarterly'),
  t.Literal('yearly'),
])

// Whitelist of client-editable columns; totals, numbering, status, and
// publishing fields stay server-managed.
const documentEditableFields = [
  'projectId',
  'contactId',
  'currency',
  'documentLanguage',
  'issueDate',
  'dueDate',
  'discountCents',
  'taxRateBps',
  'whtRateBps',
  'senderProfileId',
  'vatRegistered',
  'remark',
  'isRecurring',
  'recurringInterval',
  'registeredName',
  'registeredNameEn',
  'yourEmail',
  'yourPhone',
  'registeredAddress',
  'registeredAddressEn',
  'yourCountry',
  'yourZip',
  'yourTaxId',
  'yourBranchNumber',
  'yourLogo',
  'signatureImage',
  'signatureEnabled',
  'signaturePlacement',
  'clientName',
  'clientNameTh',
  'clientEmail',
  'clientPhone',
  'clientAddress',
  'clientAddressTh',
  'clientCountry',
  'clientZip',
  'clientTaxId',
  'clientBranchNumber',
  'bankName',
  'accountNumber',
  'accountName',
  'swiftCode',
  'promptPayId',
  'cardNumber',
  'cardExpiry',
  'cardholderName',
] as const

const _documentInsert = createInsertSchema(documents, {
  type: t.Union([t.Literal('QO'), t.Literal('INV'), t.Literal('RC')]),
  recurringInterval: t.Optional(t.Nullable(RecurringInterval)),
})
export const CreateDocumentBody = t.Composite([
  t.Pick(_documentInsert, ['type', ...documentEditableFields]),
  t.Object({ items: t.Array(DocumentItemBody) }),
])

const _documentUpdate = createUpdateSchema(documents, {
  recurringInterval: t.Optional(t.Nullable(RecurringInterval)),
})
export const UpdateDocumentBody = t.Composite([
  t.Pick(_documentUpdate, [...documentEditableFields]),
  t.Object({ items: t.Optional(t.Array(DocumentItemBody)) }),
])

export const PromoteDocumentBody = t.Composite([
  t.Pick(_documentUpdate, [
    'projectId',
    'issueDate',
    'dueDate',
    'validUntilDate',
    'paymentTermsText',
    'whtRateBps',
    'remark',
    'bankName',
    'accountNumber',
    'accountName',
    'swiftCode',
    'promptPayId',
    'cardNumber',
    'cardExpiry',
    'cardholderName',
    'paidAt',
    'whtCertNumber',
  ]),
  t.Object({ walletId: t.Optional(t.String()) }),
])
