import type { Document } from '@/components/documents/types'
import type { PreviewLang } from '@/components/documents/preview/preview-labels'
import type { WizardFormValues } from '@/components/documents/wizard/wizard-schema'
import { toQuantity } from '@/lib/quantity'

/** Mirrors apps/api/src/lib/document-totals.ts — totalCents is pre-WHT, amountDue = total − wht. */
export function computeProjectedTotals(input: {
  subtotalCents: number
  discountCents: number
  taxRateBps: number
  whtRateBps: number
}) {
  const clampedDiscount = Math.min(input.discountCents, input.subtotalCents)
  const taxBase = Math.max(input.subtotalCents - clampedDiscount, 0)
  const taxCents = Math.round((taxBase * input.taxRateBps) / 10000)
  const totalCents = Math.max(taxBase + taxCents, 0)
  const whtCents = Math.round((taxBase * input.whtRateBps) / 10000)
  const amountDueCents = Math.max(totalCents - whtCents, 0)
  return { taxCents, totalCents, whtCents, amountDueCents }
}

/**
 * Builds a complete Document from in-progress wizard values so the create
 * wizard can render the same GuestDocumentView the customer will see.
 */
export function wizardValuesToProjectedDocument(
  values: WizardFormValues,
  opts: { number?: string; lang: PreviewLang },
): Document {
  const items = values.items
    .filter((item) => item.itemDescription.trim())
    .map((item, i) => {
      const qty = item.qty ?? 1
      const amount = item.amount ?? 0
      return {
        id: `preview-${i}`,
        documentId: 'preview',
        description: item.itemDescription.trim(),
        quantity: toQuantity(qty),
        unitPriceCents: Math.round(amount * 100),
        subtotalCents: Math.round(qty * amount * 100),
        position: i,
      }
    })

  const subtotalCents = items.reduce((sum, item) => sum + item.subtotalCents, 0)
  const totals = computeProjectedTotals({
    subtotalCents,
    discountCents: values.discountCents,
    taxRateBps: values.taxRateBps,
    whtRateBps: values.whtRateBps,
  })

  const useEn = opts.lang === 'en' && values.vatRegistered

  return {
    id: 'preview',
    userId: 'preview',
    type: values.type,
    status: 'draft',
    number: opts.number ?? '#—',
    projectName: null,
    contactExists: false,
    currency: values.currency,
    subtotalCents,
    discountCents: values.discountCents,
    taxRateBps: values.taxRateBps,
    whtRateBps: values.whtRateBps,
    ...totals,
    issueDate: values.issueDate,
    dueDate: values.dueDate,
    documentLanguage: opts.lang,
    vatRegistered: values.vatRegistered,
    registeredName: useEn
      ? values.registeredNameEn?.trim() || values.registeredName
      : values.registeredName,
    registeredNameEn: values.registeredNameEn,
    yourEmail: values.yourEmail,
    yourPhone: values.yourPhone,
    registeredAddress: useEn
      ? values.registeredAddressEn?.trim() || values.registeredAddress
      : values.registeredAddress,
    registeredAddressEn: values.registeredAddressEn,
    yourBranchNumber: values.vatRegistered ? values.yourBranchNumber : null,
    yourCountry: values.yourCountry,
    yourZip: values.yourZip,
    yourTaxId: values.yourTaxId,
    yourLogo: values.yourLogo,
    signatureImage: values.signatureImage,
    signatureEnabled: values.signatureEnabled,
    signaturePlacement: values.signaturePlacement,
    clientName: values.clientName,
    clientNameTh: values.clientNameTh,
    clientEmail: values.clientEmail,
    clientPhone: values.clientPhone,
    clientAddress: values.clientAddress,
    clientAddressTh: values.clientAddressTh,
    clientBranchNumber: values.clientBranchNumber,
    clientCountry: values.clientCountry,
    clientZip: values.clientZip,
    clientTaxId: values.clientTaxId,
    bankName: values.bankName,
    accountNumber: values.accountNumber,
    accountName: values.accountName,
    swiftCode: values.swiftCode,
    promptPayId: values.promptPayId,
    cardNumber: values.cardNumber,
    cardExpiry: values.cardExpiry,
    cardholderName: values.cardholderName,
    remark: values.remark,
    pdfR2Key: null,
    parentDocumentId: null,
    isRecurring: values.isRecurring,
    recurringInterval: values.recurringInterval,
    projectId: values.projectId,
    contactId: values.contactId,
    paidAt: null,
    createdAt: '',
    updatedAt: '',
    deletedAt: null,
    items,
  }
}

/**
 * Projects what a promotion (QO→INV, INV→RC) will create so the promote page
 * previews the exact document the server will produce.
 */
export function promotionProjectedDocument(
  doc: Document,
  p: {
    type: 'INV' | 'RC'
    number: string
    lang: PreviewLang
    issueDate: string | null
    dueDate: string | null
    whtRateBps: number
    remark: string | null
    paymentTermsText?: string | null
    payment?: Pick<
      Document,
      | 'bankName'
      | 'accountNumber'
      | 'accountName'
      | 'swiftCode'
      | 'promptPayId'
      | 'cardNumber'
      | 'cardExpiry'
      | 'cardholderName'
    >
    paidAt?: string | null
  },
): Document {
  const totals = computeProjectedTotals({
    subtotalCents: doc.subtotalCents,
    discountCents: doc.discountCents,
    taxRateBps: doc.taxRateBps,
    whtRateBps: p.whtRateBps,
  })
  return {
    ...doc,
    type: p.type,
    number: p.number,
    documentLanguage: p.lang,
    issueDate: p.issueDate,
    dueDate: p.dueDate,
    whtRateBps: p.whtRateBps,
    ...totals,
    remark: p.remark,
    // Mirrors the server: body value wins, else the source document's text.
    paymentTermsText: p.paymentTermsText !== undefined ? p.paymentTermsText : doc.paymentTermsText,
    paidAt: p.paidAt ?? null,
    ...p.payment,
  }
}
