import { db } from '@api/db'
import { paymentSlips, documents, users } from '@mana/db'
import { eq, and, isNull, inArray, or, sql } from 'drizzle-orm'
import { NotFoundError, ConflictError } from '@api/lib/errors'
import { uploadFile } from '@api/modules/storage/service'
import { extractReceiptTransaction } from '@api/modules/ai/service'
import { createNotification } from '@api/modules/notifications/create'
import { recordDocumentPayment } from '@api/modules/documents/payment'
import { claimSlipVerification, releaseSlipVerification } from '@api/modules/billing/usage'
import { checkSlipQr } from '@api/modules/payment-slips/qr-check'
import { verifySlipViaThunder, isThunderConfigured } from '@api/modules/payment-slips/thunder'
import { ACTIVE_SLIP_STATUSES, paymentSlipToDto, type PaymentSlipDto, type PaymentSlipSource, type PaymentSlipStatus } from '@api/modules/payment-slips/wire'
import { publicDocumentAccessCondition } from '@api/modules/documents/public-link'

export { type PaymentSlipDto, type PaymentSlipSource, type PaymentSlipStatus, listActivePaymentSlips } from '@api/modules/payment-slips/wire'

// Tight tolerance for "matches" — extraction rounding, not a real amount discrepancy.
const AMOUNT_TOLERANCE_CENTS = 1

// Guest uploads bill the document owner's AI+Thunder provider — cap lifetime attempts per
// document so an abusive guest link can't run the owner's usage up unbounded.
const GUEST_SLIP_LIFETIME_CAP = 20

/** Resolve a document id from its public share token — used by the guest upload route. */
export async function resolveDocumentIdByToken(token: string): Promise<string | null> {
  const [doc] = await db
    .select({ id: documents.id })
    .from(documents)
    .where(publicDocumentAccessCondition(token))
  return doc?.id ?? null
}

export async function uploadPaymentSlip({
  documentId,
  file,
  source,
  ownerUserId,
}: {
  documentId: string
  file: File
  source: PaymentSlipSource
  /** Required when source === 'owner' — enforces the slip is attached by the document's actual owner. */
  ownerUserId?: string
}): Promise<PaymentSlipDto> {
  const [document] = await db
    .select()
    .from(documents)
    .where(and(eq(documents.id, documentId), isNull(documents.deletedAt)))
  if (!document) throw new NotFoundError('Document not found')
  if (source === 'owner' && document.userId !== ownerUserId) throw new NotFoundError('Document not found')

  const [activeSlip] = await db
    .select({ id: paymentSlips.id })
    .from(paymentSlips)
    .where(and(eq(paymentSlips.documentId, documentId), inArray(paymentSlips.status, ACTIVE_SLIP_STATUSES)))
  if (activeSlip) throw new ConflictError('A payment slip is already pending review for this document')

  if (source === 'guest') {
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(paymentSlips)
      .where(eq(paymentSlips.documentId, documentId))
    if (count >= GUEST_SLIP_LIFETIME_CAP) {
      throw new ConflictError('Too many payment slip attempts for this document')
    }
  }

  let extractedAmountCents: number | null = null
  let extractedCurrency: string | null = null
  let extractedDate: string | null = null
  let extractedRef: string | null = null
  let aiUncertain = false
  let status: PaymentSlipStatus
  let mismatchWarning: string | null = null

  try {
    const draft = await extractReceiptTransaction(document.userId, file, document.currency)
    extractedAmountCents = Math.round(draft.amount * 100)
    extractedCurrency = draft.currency
    extractedDate = draft.date
    extractedRef = draft.reference ?? null
    aiUncertain = draft.flags.length > 0

    if (Math.abs(extractedAmountCents - document.amountDueCents) <= AMOUNT_TOLERANCE_CENTS) {
      status = 'proposed'
    } else {
      status = 'mismatched'
      mismatchWarning = `Slip amount (${extractedAmountCents}) does not match document amount due (${document.amountDueCents})`
    }
  } catch (err) {
    status = 'failed'
    mismatchWarning = err instanceof Error ? err.message : 'Could not read the payment slip'
  }

  const qrCheck = await checkSlipQr(Buffer.from(await file.arrayBuffer()))
  let qrWarning: string | null = null
  if (!qrCheck.qrFound) {
    qrWarning = 'qr_not_found'
  } else {
    const [reused] = await db
      .select({ id: paymentSlips.id, status: paymentSlips.status })
      .from(paymentSlips)
      .where(eq(paymentSlips.qrRawText, qrCheck.qrRawText!))
    if (reused?.status === 'confirmed') {
      // Already used to pay a document (this one or another) — never a soft mismatch, this is reuse/fraud.
      throw new ConflictError('This payment slip has already been used to pay another document')
    }
    if (reused) {
      qrWarning = 'qr_reused'
      // Force review regardless of the amount-tolerance outcome — but don't relabel an
      // already-failed extraction, that status carries its own (still visible) meaning.
      if (status !== 'failed') status = 'mismatched'
    }
  }

  // Upload regardless of extraction outcome — the owner needs to see the slip image either way.
  const stored = await uploadFile(document.userId, file, {
    kind: 'image',
    entityType: 'payment_slip',
    entityId: documentId,
  })

  const [slip] = await db.insert(paymentSlips).values({
    documentId,
    fileId: stored.id,
    source,
    status,
    extractedAmountCents,
    extractedCurrency,
    extractedDate,
    extractedRef,
    aiUncertain,
    mismatchWarning,
    qrChecked: true,
    qrFound: qrCheck.qrFound,
    qrRawText: qrCheck.qrRawText,
    qrWarning,
  }).returning()

  await createNotification({
    userId: document.userId,
    title: 'Payment slip uploaded',
    body: `A payment slip was uploaded for ${document.number}.`,
    key: 'paymentSlipUploaded',
    params: { number: document.number },
    link: `/documents/${documentId}`,
    event: 'paymentSlipAttention',
  })

  // Fire tier-2 bank verification immediately on upload — owner or guest, doesn't matter, the
  // check runs against the document owner's configured provider. Falls back to leaving the slip unverified
  // (owner can retry via the verify endpoint) when Thunder isn't configured, the check itself fails — none of that should block the upload from succeeding.
  if (qrCheck.qrFound && ACTIVE_SLIP_STATUSES.includes(status)) {
    try {
      return await runThunderVerification(document, slip)
    } catch {
      // fall through — return the unverified slip below
    }
  }

  return paymentSlipToDto(slip, document.userId)
}

export async function confirmPaymentSlip(userId: string, documentId: string, slipId: string, allowUnverified = false) {
  const [document] = await db
    .select()
    .from(documents)
    .where(and(eq(documents.id, documentId), eq(documents.userId, userId), isNull(documents.deletedAt)))
  if (!document) throw new NotFoundError('Document not found')

  const [slip] = await db
    .select()
    .from(paymentSlips)
    .where(and(eq(paymentSlips.id, slipId), eq(paymentSlips.documentId, documentId)))
  if (!slip) throw new NotFoundError('Payment slip not found')
  if (slip.status !== 'proposed' && slip.status !== 'mismatched') {
    throw new ConflictError('This payment slip has already been resolved')
  }
  if (slip.extractedAmountCents === null || slip.extractedDate === null) {
    throw new ConflictError('This payment slip has no usable extracted data to confirm')
  }
  // Owner can override with allowUnverified when Thunder itself is down/unconfigured or they
  // trust the slip anyway — but the override never bypasses the checks above.
  if (!slip.apiVerified && isThunderConfigured() && !allowUnverified) {
    throw new ConflictError('This payment slip has not been bank-verified yet', 'SLIP_UNVERIFIED')
  }

  const result = await recordDocumentPayment({
    userId,
    documentId,
    documentNumber: document.number,
    amountCents: slip.extractedAmountCents,
    description: `PromptPay slip — ${document.number}`,
    date: slip.extractedDate,
    currency: slip.extractedCurrency ?? document.currency,
    status: 'received',
    source: 'promptpay_slip',
  })

  await db
    .update(paymentSlips)
    .set({ status: 'confirmed', transactionId: result.transaction.id, updatedAt: new Date() })
    .where(eq(paymentSlips.id, slipId))

  return result
}

export async function dismissPaymentSlip(userId: string, documentId: string, slipId: string): Promise<PaymentSlipDto> {
  const [document] = await db
    .select({ userId: documents.userId })
    .from(documents)
    .where(and(eq(documents.id, documentId), eq(documents.userId, userId), isNull(documents.deletedAt)))
  if (!document) throw new NotFoundError('Document not found')

  const [slip] = await db
    .select()
    .from(paymentSlips)
    .where(and(eq(paymentSlips.id, slipId), eq(paymentSlips.documentId, documentId)))
  if (!slip) throw new NotFoundError('Payment slip not found')
  if (slip.status !== 'proposed' && slip.status !== 'mismatched' && slip.status !== 'failed') {
    throw new ConflictError('This payment slip has already been resolved')
  }

  const [updated] = await db
    .update(paymentSlips)
    .set({ status: 'dismissed', updatedAt: new Date() })
    .where(eq(paymentSlips.id, slipId))
    .returning()

  return paymentSlipToDto(updated, userId)
}

type PaymentSlipRow = typeof paymentSlips.$inferSelect
type DocumentRow = typeof documents.$inferSelect

/** Real bank-side verification (Thunder Solution) — Tier 2. Fired on upload; also callable as a manual retry. */
async function runThunderVerification(document: DocumentRow, slip: PaymentSlipRow): Promise<PaymentSlipDto> {
  if (!ACTIVE_SLIP_STATUSES.includes(slip.status as PaymentSlipStatus)) {
    throw new ConflictError('This slip has already been resolved')
  }
  if (!slip.qrFound || !slip.qrRawText) {
    throw new ConflictError('No QR code was detected in this slip — a bank verification check cannot run')
  }

  const [owner] = await db.select({ id: users.id }).from(users).where(eq(users.id, document.userId))
  if (!owner) throw new NotFoundError('User not found')

  await claimSlipVerification(document.userId)

  const result = await verifySlipViaThunder(slip.qrRawText, document.amountDueCents, {
    accountNumber: document.accountNumber,
    promptPayId: document.promptPayId,
  })

  if (!result.ok) {
    await releaseSlipVerification(document.userId)
    throw new ConflictError(result.message)
  }

  if (result.transRef) {
    const [existing] = await db
      .select({ documentId: paymentSlips.documentId })
      .from(paymentSlips)
      .where(and(
        eq(paymentSlips.transRef, result.transRef),
        or(eq(paymentSlips.apiVerified, true), eq(paymentSlips.status, 'confirmed')),
      ))
    if (existing && existing.documentId !== document.id) {
      await releaseSlipVerification(document.userId)
      throw new ConflictError('This bank transaction has already been used to verify another document')
    }
  }

  const [updated] = await db
    .update(paymentSlips)
    .set({
      apiVerified: true,
      apiVerificationProvider: 'thunder',
      apiVerifiedAt: new Date(),
      apiVerificationRaw: result.raw,
      transRef: result.transRef || null,
      updatedAt: new Date(),
    })
    .where(eq(paymentSlips.id, slip.id))
    .returning()

  return paymentSlipToDto(updated!, document.userId)
}

/** Manual retry path for the review panel — same check as the automatic one fired on upload. */
export async function verifyPaymentSlipWithProvider(userId: string, documentId: string, slipId: string): Promise<PaymentSlipDto> {
  const [document] = await db
    .select()
    .from(documents)
    .where(and(eq(documents.id, documentId), eq(documents.userId, userId), isNull(documents.deletedAt)))
  if (!document) throw new NotFoundError('Document not found')

  const [slip] = await db
    .select()
    .from(paymentSlips)
    .where(and(eq(paymentSlips.id, slipId), eq(paymentSlips.documentId, documentId)))
  if (!slip) throw new NotFoundError('Payment slip not found')

  return runThunderVerification(document, slip)
}
