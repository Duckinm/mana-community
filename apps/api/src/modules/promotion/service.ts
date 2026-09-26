import { db } from '@api/db'
import { documents, documentItems } from '@mana/db'
import { computeDocumentTotals } from '@api/lib/document-totals'
import { todayCalendarDate } from '@api/lib/calendar-date'
import { ValidationError } from '@api/lib/errors'
import { validateDocumentAmounts } from '@mana/db/document-create-validation'
import { getDocument, generateDocumentNumber } from '@api/modules/documents/service'
import { documentItemRowsForInsert } from '@api/modules/documents/line-items'
import { recordDocumentPayment } from '@api/modules/documents/payment'

type PromoteBody = {
  projectId?: string | null
  issueDate?: string | null
  dueDate?: string | null
  validUntilDate?: string | null
  paymentTermsText?: string | null
  whtRateBps?: number
  remark?: string | null
  bankName?: string | null
  accountNumber?: string | null
  accountName?: string | null
  swiftCode?: string | null
  promptPayId?: string | null
  cardNumber?: string | null
  cardExpiry?: string | null
  cardholderName?: string | null
  paidAt?: string | null
  whtCertNumber?: string | null
  walletId?: string
}

const PROMOTION_TYPE_MAP: Record<string, 'INV' | 'RC'> = { QO: 'INV', INV: 'RC' }

/**
 * Promote a document to the next type in its lifecycle (QO -> INV -> RC).
 * Promoting to RC also creates a matching paid revenue transaction and
 * reconciles it against the new receipt, marking it paid.
 */
export async function promote(userId: string, sourceDocumentId: string, body: PromoteBody) {
  const source = await getDocument(userId, sourceDocumentId)

  if (source.type === 'RC') throw new ValidationError('Receipt cannot be promoted further')
  const targetType = PROMOTION_TYPE_MAP[source.type] as 'INV' | 'RC'

  if (targetType === 'RC' && !body.walletId) {
    throw new ValidationError('walletId is required')
  }

  const resolvedProjectId = body.projectId !== undefined ? body.projectId : source.projectId

  const number = await generateDocumentNumber(userId, targetType)

  const resolvedWhtRateBps = body.whtRateBps ?? source.whtRateBps
  const issueDate = body.issueDate ?? todayCalendarDate()
  const dueDate = targetType === 'RC' ? null : (body.dueDate ?? source.dueDate)

  // Promotion writes the new document directly, so it never passes through the
  // create/patch validators.
  const issues = validateDocumentAmounts({ issueDate, dueDate, whtRateBps: resolvedWhtRateBps })
  if (issues.includes('due-before-issue')) throw new ValidationError('Due date cannot be before issue date')
  if (issues.includes('rate-out-of-range')) throw new ValidationError('Withholding rate must be between 0% and 100%')

  const hasBankOverride =
    body.bankName !== undefined ||
    body.accountNumber !== undefined ||
    body.accountName !== undefined ||
    body.swiftCode !== undefined ||
    body.promptPayId !== undefined ||
    body.cardNumber !== undefined ||
    body.cardExpiry !== undefined ||
    body.cardholderName !== undefined

  let whtCents = source.whtCents
  let totalCents = source.totalCents
  let amountDueCents = source.amountDueCents
  if (body.whtRateBps !== undefined) {
    const totals = computeDocumentTotals({
      items: (source.items ?? []).map((i) => ({
        subtotalCents: i.subtotalCents,
      })),
      taxRateBps: source.taxRateBps,
      discountCents: source.discountCents,
      whtRateBps: resolvedWhtRateBps,
    })
    whtCents = totals.whtCents
    totalCents = totals.totalCents
    amountDueCents = totals.amountDueCents
  }

  const { newDoc, items } = await db.transaction(async (tx) => {
    const [newDoc] = await tx.insert(documents).values({
      userId,
      type: targetType,
      number,
      status: targetType === 'RC' ? 'published' : 'draft',
      projectId: resolvedProjectId,
      contactId: source.contactId,
      currency: source.currency,
      documentLanguage: source.documentLanguage,
      issueDate,
      dueDate,
      validUntilDate: null,
      paymentTermsText: body.paymentTermsText ?? source.paymentTermsText,
      paidAt: targetType === 'RC' ? (body.paidAt ?? null) : null,
      whtCertNumber: targetType === 'RC' ? (body.whtCertNumber ?? null) : null,
      sentAt: null,
      discountCents: source.discountCents,
      taxRateBps: source.taxRateBps,
      taxCents: source.taxCents,
      whtRateBps: resolvedWhtRateBps,
      whtCents,
      subtotalCents: source.subtotalCents,
      totalCents,
      amountDueCents,
      senderProfileId: source.senderProfileId,
      vatRegistered: source.vatRegistered,
      remark: body.remark === undefined ? source.remark : body.remark,
      registeredName: source.registeredName,
      registeredNameEn: source.registeredNameEn,
      yourEmail: source.yourEmail,
      yourPhone: source.yourPhone,
      registeredAddress: source.registeredAddress,
      registeredAddressEn: source.registeredAddressEn,
      yourCountry: source.yourCountry,
      yourZip: source.yourZip,
      yourTaxId: source.yourTaxId,
      yourBranchNumber: source.yourBranchNumber,
      yourLogo: source.yourLogo,
      signatureImage: source.signatureImage,
      signaturePlacement: source.signaturePlacement,
      // Signature is invoice-only; carry the flag only when promoting to INV.
      signatureEnabled: targetType === 'INV' ? source.signatureEnabled : false,
      clientName: source.clientName,
      clientNameTh: source.clientNameTh,
      clientEmail: source.clientEmail,
      clientPhone: source.clientPhone,
      clientAddress: source.clientAddress,
      clientAddressTh: source.clientAddressTh,
      clientCountry: source.clientCountry,
      clientZip: source.clientZip,
      clientTaxId: source.clientTaxId,
      clientBranchNumber: source.clientBranchNumber,
      bankName: hasBankOverride ? body.bankName ?? null : source.bankName,
      accountNumber: hasBankOverride ? body.accountNumber ?? null : source.accountNumber,
      accountName: hasBankOverride ? body.accountName ?? null : source.accountName,
      swiftCode: hasBankOverride ? body.swiftCode ?? null : source.swiftCode,
      promptPayId: hasBankOverride ? body.promptPayId ?? null : source.promptPayId,
      cardNumber: hasBankOverride ? body.cardNumber ?? null : source.cardNumber,
      cardExpiry: hasBankOverride ? body.cardExpiry ?? null : source.cardExpiry,
      cardholderName: hasBankOverride ? body.cardholderName ?? null : source.cardholderName,
      parentDocumentId: source.id,
    }).returning()

    let items: (typeof documentItems.$inferSelect)[] = []
    if (source.items.length > 0) {
      items = await tx.insert(documentItems).values(
        documentItemRowsForInsert(
          newDoc.id,
          source.items.map((item) => ({
            description: item.description,
            quantity: item.quantity,
            unitPriceCents: item.unitPriceCents,
            position: item.position,
            subtotalCents: item.subtotalCents,
          })),
        ),
      ).returning()
    }

    return { newDoc, items }
  })

  if (targetType !== 'RC') return { ...newDoc, items }

  const { document } = await recordDocumentPayment({
    userId,
    documentId: newDoc.id,
    documentNumber: newDoc.number,
    amountCents: newDoc.totalCents,
    description: `Invoice ${newDoc.number}`,
    category: 'Invoice payment',
    currency: newDoc.currency,
    date: newDoc.paidAt ?? todayCalendarDate(),
    status: 'paid',
    walletId: body.walletId,
    projectId: resolvedProjectId,
  })
  return { ...newDoc, ...document, items }
}
