import { db } from '@api/db'
import { paymentSlips } from '@mana/db'
import { eq, and, inArray, desc } from 'drizzle-orm'
import { getFileSignedUrl } from '@api/modules/storage/service'
import { instantFieldToWire } from '@api/lib/wire-row'

export type PaymentSlipSource = 'guest' | 'owner'
export type PaymentSlipStatus = 'proposed' | 'mismatched' | 'confirmed' | 'dismissed' | 'failed'

// Blocks a new upload — an unresolved proposal is still waiting on the owner.
export const ACTIVE_SLIP_STATUSES: PaymentSlipStatus[] = ['proposed', 'mismatched']
// Shown to the owner on the document — includes 'failed' so a failed extraction attempt
// isn't silently invisible (owner needs to see it happened, even though it doesn't block retry).
export const VISIBLE_SLIP_STATUSES: PaymentSlipStatus[] = ['proposed', 'mismatched', 'failed']

export interface PaymentSlipDto {
  id: string
  documentId: string
  source: PaymentSlipSource
  status: PaymentSlipStatus
  extractedAmountCents: number | null
  extractedCurrency: string | null
  extractedDate: string | null
  mismatchWarning: string | null
  aiUncertain: boolean
  fileUrl: string | null
  createdAt: string
  qrFound: boolean
  qrWarning: string | null
  apiVerified: boolean
  apiVerificationProvider: string | null
  apiVerifiedAt: string | null
}

type PaymentSlipRow = typeof paymentSlips.$inferSelect

export async function paymentSlipToDto(row: PaymentSlipRow, ownerId: string): Promise<PaymentSlipDto> {
  return {
    id: row.id,
    documentId: row.documentId,
    source: row.source as PaymentSlipSource,
    status: row.status as PaymentSlipStatus,
    extractedAmountCents: row.extractedAmountCents,
    extractedCurrency: row.extractedCurrency,
    extractedDate: row.extractedDate,
    mismatchWarning: row.mismatchWarning,
    aiUncertain: row.aiUncertain,
    fileUrl: await getFileSignedUrl(ownerId, row.fileId),
    createdAt: instantFieldToWire(row.createdAt)!,
    qrFound: row.qrFound,
    qrWarning: row.qrWarning,
    apiVerified: row.apiVerified,
    apiVerificationProvider: row.apiVerificationProvider,
    apiVerifiedAt: instantFieldToWire(row.apiVerifiedAt),
  }
}

/** Payment slips proposed against a document — visible ones only (`proposed`/`mismatched`/`failed`), most recent first. Used to embed into document GET responses. */
export async function listActivePaymentSlips(documentId: string, ownerId: string): Promise<PaymentSlipDto[]> {
  const rows = await db
    .select()
    .from(paymentSlips)
    .where(and(eq(paymentSlips.documentId, documentId), inArray(paymentSlips.status, VISIBLE_SLIP_STATUSES)))
    .orderBy(desc(paymentSlips.createdAt))
  return Promise.all(rows.map((row) => paymentSlipToDto(row, ownerId)))
}

/** Status of the most recently created payment slip for a document, regardless of visibility (e.g. `dismissed`). Lets the frontend surface a notice when the guest's previous submission was rejected. */
export async function getLatestSlipStatus(documentId: string): Promise<PaymentSlipStatus | null> {
  const [row] = await db
    .select({ status: paymentSlips.status })
    .from(paymentSlips)
    .where(eq(paymentSlips.documentId, documentId))
    .orderBy(desc(paymentSlips.createdAt))
    .limit(1)
  return (row?.status as PaymentSlipStatus) ?? null
}

/** Batched version of `getLatestSlipStatus`, restricted to visible statuses — used by the document list so it needs one query instead of one per row. */
export async function getVisibleSlipStatusesByDocumentIds(documentIds: string[]): Promise<Map<string, PaymentSlipStatus>> {
  if (documentIds.length === 0) return new Map()

  const rows = await db
    .select({ documentId: paymentSlips.documentId, status: paymentSlips.status })
    .from(paymentSlips)
    .where(and(inArray(paymentSlips.documentId, documentIds), inArray(paymentSlips.status, VISIBLE_SLIP_STATUSES)))
    .orderBy(desc(paymentSlips.createdAt))

  const map = new Map<string, PaymentSlipStatus>()
  for (const row of rows) {
    if (!map.has(row.documentId)) map.set(row.documentId, row.status as PaymentSlipStatus)
  }
  return map
}
