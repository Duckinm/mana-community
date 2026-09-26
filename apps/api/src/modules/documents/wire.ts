import type { documents, documentItems, documentVersions } from '@mana/db'
import { instantFieldToWire, type WireTimestamps } from '@api/lib/wire-row'
import { presignDocumentImage } from '@api/modules/documents/images'
import type { PaymentSlipDto, PaymentSlipStatus } from '@api/modules/payment-slips/wire'

type DocumentRow = typeof documents.$inferSelect
type DocumentItemRow = typeof documentItems.$inferSelect
type DocumentVersionRow = typeof documentVersions.$inferSelect

const DOCUMENT_INSTANT_KEYS = [
  'createdAt',
  'updatedAt',
  'deletedAt',
  'sentAt',
  'clientApprovedAt',
  'viewedAt',
  'pdfFailedAt',
  'publicAccessRevokedAt',
  'publicAccessRotatedAt',
] as const satisfies readonly (keyof DocumentRow)[]

export type DocumentWire = WireTimestamps<DocumentRow, typeof DOCUMENT_INSTANT_KEYS[number]> & {
  items: DocumentItemRow[]
  paymentSlips: PaymentSlipDto[]
  latestPaymentSlipStatus: PaymentSlipStatus | null
}

export type DocumentVersionWire = {
  id: string
  documentId: string
  version: number
  snapshotJson: string
  createdAt: string
}

const GUEST_DOCUMENT_KEYS = [
  'id', 'type', 'status', 'number', 'currency', 'documentLanguage',
  'subtotalCents', 'discountCents', 'taxRateBps', 'taxCents', 'whtRateBps', 'whtCents',
  'totalCents', 'amountDueCents', 'issueDate', 'dueDate', 'paidAt', 'clientStatus',
  'registeredName', 'yourEmail', 'yourPhone', 'registeredAddress', 'yourCountry', 'yourZip',
  'yourTaxId', 'yourBranchNumber', 'signatureEnabled', 'signaturePlacement',
  'clientName', 'clientEmail', 'clientPhone', 'clientAddress', 'clientCountry', 'clientZip',
  'clientTaxId', 'clientBranchNumber',
  'bankName', 'accountNumber', 'accountName', 'swiftCode', 'promptPayId',
  'cardNumber', 'cardExpiry', 'cardholderName', 'remark',
] as const satisfies readonly (keyof DocumentRow)[]

type GuestDocumentItemWire = Pick<DocumentItemRow, 'id' | 'description' | 'quantity' | 'unitPriceCents' | 'subtotalCents'>

export type GuestDocumentWire = Pick<DocumentRow, typeof GUEST_DOCUMENT_KEYS[number]> & {
  clientApprovedAt: string | null
  yourLogo: string | null
  signatureImage: string | null
  items: GuestDocumentItemWire[]
  paymentSlips: PaymentSlipDto[]
  latestPaymentSlipStatus: PaymentSlipStatus | null
  isOwner: boolean
  showBranding: boolean
}

export async function documentToGuestWire(
  doc: DocumentRow,
  items: DocumentItemRow[],
  paymentSlips: PaymentSlipDto[],
  latestPaymentSlipStatus: PaymentSlipStatus | null,
  isOwner: boolean,
  showBranding: boolean,
): Promise<GuestDocumentWire> {
  const [yourLogo, signatureImage] = await Promise.all([
    presignDocumentImage(doc.yourLogo),
    presignDocumentImage(doc.signatureImage),
  ])
  const picked = {} as Record<string, unknown>
  for (const key of GUEST_DOCUMENT_KEYS) picked[key] = doc[key]
  return {
    ...picked,
    clientApprovedAt: instantFieldToWire(doc.clientApprovedAt),
    yourLogo,
    signatureImage,
    items: items.map((i) => ({
      id: i.id,
      description: i.description,
      quantity: i.quantity,
      unitPriceCents: i.unitPriceCents,
      subtotalCents: i.subtotalCents,
    })),
    paymentSlips,
    latestPaymentSlipStatus,
    isOwner,
    showBranding,
  } as GuestDocumentWire
}

export async function documentToWire(
  doc: DocumentRow,
  items: DocumentItemRow[] = [],
  paymentSlips: PaymentSlipDto[] = [],
  latestPaymentSlipStatus: PaymentSlipStatus | null = null,
): Promise<DocumentWire> {
  const wired = { ...doc } as Record<string, unknown>
  for (const key of DOCUMENT_INSTANT_KEYS) {
    wired[key] = instantFieldToWire(doc[key] as Date | null | undefined)
  }
  const [yourLogo, signatureImage] = await Promise.all([
    presignDocumentImage(doc.yourLogo),
    presignDocumentImage(doc.signatureImage),
  ])
  return { ...wired, yourLogo, signatureImage, items, paymentSlips, latestPaymentSlipStatus } as DocumentWire
}

export function documentVersionToWire(row: DocumentVersionRow): DocumentVersionWire {
  return {
    id: row.id,
    documentId: row.documentId,
    version: row.version,
    snapshotJson: row.snapshotJson,
    createdAt: instantFieldToWire(row.createdAt)!,
  }
}
