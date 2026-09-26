import { z } from 'zod'
import type { ReactFormExtendedApi } from '@tanstack/react-form'
import { createDocumentInputSchema } from '@/components/documents/document-schema'
import type { DocumentType } from '@/components/documents/types'
import i18next from '@/lib/i18n'

/**
 * Sender profile as returned by the API (Eden-inferred from the Drizzle-backed
 * wire schema). `useAsPaymentAddress` is a wizard-only form field and lives on
 * the local form state (business-panel.tsx), not on the persisted profile.
 */
export type { ApiSenderProfile as SenderProfile } from '@/lib/api-types'

export const wizardItemSchema = z.object({
  itemDescription: z.string(),
  qty: z.number().optional(),
  amount: z.number().optional(),
})

export const wizardFormSchema = createDocumentInputSchema.extend({
  step: z.string(),
  type: z.enum(['QO', 'INV', 'RC']),
  senderProfileId: z.string().nullable(),
  remarkTemplateId: z.string().nullable(),
  paymentTemplateId: z.string().nullable(),
  currency: z.string(),
  projectId: z.string().nullable(),
  contactId: z.string().nullable(),
  addToContactLibrary: z.boolean(),
  issueDate: z.string().nullable(),
  dueDate: z.string().nullable(),
  discountCents: z.number(),
  taxRateBps: z.number(),
  whtRateBps: z.number(),
  remark: z.string().nullable(),
  items: z.array(wizardItemSchema),
  documentLanguage: z.enum(['th', 'en']),
  vatRegistered: z.boolean(),
  useRegisteredAddressForPayment: z.boolean(),
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
  signatureImage: z.string().nullable(),
  signatureEnabled: z.boolean(),
  signaturePlacement: z.string().nullable(),
  clientEntityType: z.enum(['company', 'individual']),
  clientVatRegistered: z.boolean(),
  clientName: z
    .string()
    .nullable()
    .refine((v) => !!v?.trim(), { message: i18next.t('wizardForm.clientNameRequired', { ns: 'documents' }) }),
  clientNameTh: z.string().nullable(),
  clientEmail: z.string().nullable(),
  clientPhone: z
    .string()
    .nullable()
    .refine((v) => !!v?.trim(), { message: i18next.t('wizardForm.clientPhoneRequired', { ns: 'documents' }) }),
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
  isRecurring: z.boolean(),
  recurringInterval: z.enum(['monthly', 'quarterly', 'yearly']).nullable(),
})

export type WizardItem = z.infer<typeof wizardItemSchema>
export type WizardFormValues = z.infer<typeof wizardFormSchema>

export type WizardForm = ReactFormExtendedApi<
  WizardFormValues,
  any,
  any,
  any,
  any,
  any,
  any,
  any,
  any,
  any,
  any,
  any
>

export type { DocumentType }
