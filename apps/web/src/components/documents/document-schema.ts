import { z } from 'zod'

export const documentTypeSchema = z.enum(['QO', 'INV', 'RC'])
export const documentStatusSchema = z.enum(['draft', 'published', 'archived', 'overdue'])
export const recurringIntervalSchema = z.enum(['monthly', 'quarterly', 'yearly'])

export const documentItemSchema = z.object({
  id: z.string(),
  documentId: z.string(),
  description: z.string(),
  quantity: z.number(),
  unitPriceCents: z.number(),
  subtotalCents: z.number(),
  position: z.number(),
})

export const paymentSlipSourceSchema = z.enum(['guest', 'owner'])
export const paymentSlipStatusSchema = z.enum([
  'proposed',
  'mismatched',
  'confirmed',
  'dismissed',
  'failed',
])

export const paymentSlipSchema = z.object({
  id: z.string(),
  documentId: z.string(),
  source: paymentSlipSourceSchema,
  status: paymentSlipStatusSchema,
  extractedAmountCents: z.number().nullable(),
  extractedCurrency: z.string().nullable(),
  extractedDate: z.string().nullable(),
  mismatchWarning: z.string().nullable(),
  aiUncertain: z.boolean(),
  fileUrl: z.string().nullable(),
  qrFound: z.boolean(),
  qrWarning: z.string().nullable(),
  apiVerified: z.boolean(),
  apiVerificationProvider: z.string().nullable(),
  apiVerifiedAt: z.string().nullable(),
  createdAt: z.string(),
})

/**
 * Fields shared between CreateDocumentInput and wizardFormSchema.
 * This is the single source of truth for the document "input" shape.
 */
export const createDocumentInputSchema = z.object({
  type: documentTypeSchema,
  senderProfileId: z.string().nullable().optional(),
  projectId: z.string().nullable().optional(),
  contactId: z.string().nullable().optional(),
  currency: z.string().optional(),
  issueDate: z.string().nullable().optional(),
  dueDate: z.string().nullable().optional(),
  discountCents: z.number().optional(),
  taxRateBps: z.number().optional(),
  whtRateBps: z.number().optional(),
  remark: z.string().nullable().optional(),
  items: z
    .array(
      z.object({
        description: z.string(),
        quantity: z.number(),
        unitPriceCents: z.number(),
        position: z.number(),
      }),
    )
    .optional(),
  documentLanguage: z.enum(['th', 'en']).optional(),
  vatRegistered: z.boolean().optional(),
  registeredName: z.string().nullable().optional(),
  registeredNameEn: z.string().nullable().optional(),
  yourEmail: z.string().nullable().optional(),
  yourPhone: z.string().nullable().optional(),
  registeredAddress: z.string().nullable().optional(),
  registeredAddressEn: z.string().nullable().optional(),
  yourBranchNumber: z.string().nullable().optional(),
  yourCountry: z.string().nullable().optional(),
  yourZip: z.string().nullable().optional(),
  yourTaxId: z.string().nullable().optional(),
  yourLogo: z.string().nullable().optional(),
  signatureEnabled: z.boolean().optional(),
  clientEntityType: z.enum(['company', 'individual']).optional(),
  clientVatRegistered: z.boolean().optional(),
  clientName: z.string().nullable().optional(),
  clientNameTh: z.string().nullable().optional(),
  clientEmail: z.string().nullable().optional(),
  clientPhone: z.string().nullable().optional(),
  clientAddress: z.string().nullable().optional(),
  clientAddressTh: z.string().nullable().optional(),
  clientBranchNumber: z.string().nullable().optional(),
  clientCountry: z.string().nullable().optional(),
  clientZip: z.string().nullable().optional(),
  clientTaxId: z.string().nullable().optional(),
  bankName: z.string().nullable().optional(),
  accountNumber: z.string().nullable().optional(),
  accountName: z.string().nullable().optional(),
  swiftCode: z.string().nullable().optional(),
  promptPayId: z.string().nullable().optional(),
  cardNumber: z.string().nullable().optional(),
  cardExpiry: z.string().nullable().optional(),
  cardholderName: z.string().nullable().optional(),
  isRecurring: z.boolean().optional(),
  recurringInterval: recurringIntervalSchema.nullable().optional(),
})

/**
 * Full document shape returned by the API — extends createDocumentInputSchema
 * with server-computed and server-only fields.
 */
export const documentSchema = createDocumentInputSchema.extend({
  id: z.string(),
  userId: z.string(),
  type: documentTypeSchema,
  status: documentStatusSchema,
  number: z.string(),
  projectName: z.string().nullable(),
  projectIcon: z.string().nullable().optional(),
  projectColor: z.string().nullable().optional(),
  contactExists: z.boolean(),
  currency: z.string(),
  subtotalCents: z.number(),
  discountCents: z.number(),
  taxRateBps: z.number(),
  taxCents: z.number(),
  whtRateBps: z.number(),
  whtCents: z.number(),
  amountDueCents: z.number(),
  totalCents: z.number(),
  issueDate: z.string().nullable(),
  dueDate: z.string().nullable(),
  documentLanguage: z.enum(['th', 'en']),
  vatRegistered: z.boolean(),
  registeredName: z.string().nullable(),
  registeredNameEn: z.string().nullable(),
  yourEmail: z.string().nullable(),
  yourPhone: z.string().nullable(),
  registeredAddress: z.string().nullable(),
  registeredAddressEn: z.string().nullable(),
  yourBranchNumber: z.string().nullable(),
  yourCountry: z.string().nullable(),
  yourZip: z.string().nullable(),
  yourTaxId: z.string().nullable(),
  yourLogo: z.string().nullable(),
  signatureImage: z.string().nullable().optional(),
  signatureEnabled: z.boolean().optional(),
  signaturePlacement: z.string().nullable().optional(),
  clientName: z.string().nullable(),
  clientNameTh: z.string().nullable(),
  clientEmail: z.string().nullable(),
  clientPhone: z.string().nullable(),
  clientAddress: z.string().nullable(),
  clientAddressTh: z.string().nullable(),
  clientBranchNumber: z.string().nullable(),
  clientCountry: z.string().nullable(),
  clientZip: z.string().nullable(),
  clientTaxId: z.string().nullable(),
  bankName: z.string().nullable(),
  accountNumber: z.string().nullable(),
  accountName: z.string().nullable(),
  swiftCode: z.string().nullable(),
  promptPayId: z.string().nullable(),
  cardNumber: z.string().nullable(),
  cardExpiry: z.string().nullable(),
  cardholderName: z.string().nullable(),
  remark: z.string().nullable(),
  pdfR2Key: z.string().nullable(),
  publicToken: z.string().nullable().optional(),
  publicAccessRevokedAt: z.string().nullable().optional(),
  publicAccessRotatedAt: z.string().nullable().optional(),
  parentDocumentId: z.string().nullable(),
  isRecurring: z.boolean(),
  recurringInterval: recurringIntervalSchema.nullable(),
  nextGenerationDate: z.string().nullable().optional(),
  projectId: z.string().nullable(),
  contactId: z.string().nullable(),
  validUntilDate: z.string().nullable().optional(),
  paymentTermsText: z.string().nullable().optional(),
  paidAt: z.string().nullable().optional(),
  whtCertNumber: z.string().nullable().optional(),
  sentAt: z.string().nullable().optional(),
  clientStatus: z.string().nullable().optional(),
  clientApprovedAt: z.string().nullable().optional(),
  clientApprovalIp: z.string().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  deletedAt: z.string().nullable(),
  items: z.array(documentItemSchema).optional(),
  paymentSlips: z.array(paymentSlipSchema).optional(),
  latestPaymentSlipStatus: paymentSlipStatusSchema.nullable().optional(),
})

export type DocumentType = z.infer<typeof documentTypeSchema>
export type DocumentStatus = z.infer<typeof documentStatusSchema>
export type DocumentItem = z.infer<typeof documentItemSchema>
export type Document = z.infer<typeof documentSchema>
export type CreateDocumentInput = z.infer<typeof createDocumentInputSchema>
export type PaymentSlipSource = z.infer<typeof paymentSlipSourceSchema>
export type PaymentSlipStatus = z.infer<typeof paymentSlipStatusSchema>
export type PaymentSlip = z.infer<typeof paymentSlipSchema>
