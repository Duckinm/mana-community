import { documentItems, documents, emailLogs, senderProfiles, users } from '@mana/db'
import { eq } from 'drizzle-orm'
import { db } from '@api/db'
import { formatCalendarDate, parseCalendarDate } from '@api/lib/calendar-date'
import { NotFoundError } from '@api/lib/errors'
import { sendEmailSingle } from '@api/utils/email'
import { r2ObjectStore } from '@api/modules/storage/object-store'
import { convertToPdfA3 } from '@api/utils/pdf/pdfa'
import { buildEtaxXml } from '@api/utils/pdf/etax-xml'

export const ETAX_CC = 'csemail@etax.teda.th'

/** ETDA rejects attachments over 3 MB. */
export const ETAX_MAX_ATTACHMENT_BYTES = 3 * 1024 * 1024

export type SendEtaxResult =
  | { status: 'sent' | 'failed'; sentAt: string | null }
  | { status: 'blocked'; sentAt: null }
  | { status: 'no_client_email'; sentAt: null }
  | { status: 'wrong_document_type'; sentAt: null }
  | { status: 'not_published'; sentAt: null }
  | { status: 'region_not_supported'; sentAt: null }
  | { status: 'not_enabled'; sentAt: null }
  | { status: 'attachment_too_large'; sentAt: null }
  | { status: 'pdf_not_ready'; sentAt: null; pdfState: 'generating' | 'failed' }

// Sending address the seller registers with the Revenue Department. Deterministic per
// user, derived (not stored) so it survives sender-profile edits/deletes and stays
// identical across all of a user's profiles. `heymana.app` is our Resend-verified domain.
export function etaxFromEmail(userId: string): string {
  return `etax-${userId.slice(0, 8)}@heymana.app`
}

// ETDA subject spec: `[dd/mm/yyyy][INV][documentNumber]`, no spaces anywhere, year in
// Buddhist Era — etax.teda.th's own example is invoice 101/2559 issued 1 Aug 2016 →
// `[01/08/2559][INV][101/2559]`. A Gregorian year here means no time stamp comes back.
export function formatEtaxSubject(documentNumber: string, dateStr: string | null): string {
  const date = (dateStr && parseCalendarDate(dateStr)) || new Date()
  const dayMonth = formatCalendarDate(date, 'dd/MM')
  return `[${dayMonth}/${date.getFullYear() + 543}][INV][${documentNumber}]`
}

async function findEtaxSenderProfile(
  userId: string,
  senderProfileId: string | null,
  registeredName: string | null,
) {
  const profiles = await db
    .select()
    .from(senderProfiles)
    .where(eq(senderProfiles.userId, userId))

  // Documents created before sender_profile_id existed (or whose profile was deleted)
  // fall back to matching by registeredName, then to the default profile.
  const byId = senderProfileId ? profiles.find((p) => p.id === senderProfileId) : undefined
  const byName = registeredName
    ? profiles.find((p) => p.registeredName === registeredName)
    : undefined
  return byId ?? byName ?? profiles.find((p) => p.isDefault) ?? profiles[0]
}

async function fetchPdfFromR2(key: string): Promise<Buffer> {
  const bytes = await r2ObjectStore.get(key)
  if (!bytes) throw new Error('PDF object body empty')
  return Buffer.from(bytes)
}

/**
 * Send a published tax invoice (INV) to its client via the ETDA e-Tax Invoice by Email
 * (time-stamp) scheme: single PDF/A-3 attachment, CC'd to the ETDA time-stamp inbox,
 * from the seller's Revenue-Department-registered address. Manual trigger only.
 */
export async function sendDocumentEtax(userId: string, documentId: string): Promise<SendEtaxResult> {
  const [doc] = await db
    .select()
    .from(documents)
    .where(eq(documents.id, documentId))

  if (!doc || doc.userId !== userId) throw new NotFoundError()

  const [user] = await db
    .select({ region: users.region })
    .from(users)
    .where(eq(users.id, userId))

  if (user?.region !== 'TH') return { status: 'region_not_supported', sentAt: null }

  if (doc.type !== 'INV') return { status: 'wrong_document_type', sentAt: null }
  if (doc.status !== 'published') return { status: 'not_published', sentAt: null }
  if (!doc.clientEmail) return { status: 'no_client_email', sentAt: null }

  const profile = await findEtaxSenderProfile(userId, doc.senderProfileId, doc.registeredName)
  // Only a VAT registrant may issue a tax invoice at all, so ETDA would reject this
  // anyway. The UI clears etaxEnabled with VAT; a direct API call would not.
  if (!profile?.etaxEnabled || !profile.vatRegistered)
    return { status: 'not_enabled', sentAt: null }

  if (!doc.pdfR2Key) return { status: 'pdf_not_ready', sentAt: null, pdfState: doc.pdfFailedAt ? 'failed' : 'generating' }

  const [sourcePdf, items] = await Promise.all([
    fetchPdfFromR2(doc.pdfR2Key),
    db
      .select()
      .from(documentItems)
      .where(eq(documentItems.documentId, documentId))
      .orderBy(documentItems.position),
  ])

  const pdfA3 = await convertToPdfA3(sourcePdf, {
    filename: `${doc.number}.xml`,
    xml: buildEtaxXml(doc, items),
  })
  if (pdfA3.byteLength > ETAX_MAX_ATTACHMENT_BYTES) return { status: 'attachment_too_large', sentAt: null }

  const subject = formatEtaxSubject(doc.number, doc.issueDate)
  const senderName = doc.registeredName ?? doc.registeredNameEn ?? 'MANA'
  const html = `<p>Dear ${doc.clientName ?? 'Sir/Madam'},</p><p>Please find attached the tax invoice ${doc.number} from ${senderName}.</p><p>This email was sent under the Revenue Department's e-Tax Invoice by Email scheme.</p>`

  const result = await sendEmailSingle({
    from: `${senderName} <${etaxFromEmail(userId)}>`,
    to: doc.clientEmail,
    cc: ETAX_CC,
    subject,
    html,
    attachments: [{ filename: `${doc.number}.pdf`, content: pdfA3 }],
  })

  await db.insert(emailLogs).values({
    userId,
    recipient: result.to,
    subject,
    type: 'etax_sent',
    referenceId: documentId,
    status: result.status,
    resendId: result.resendId,
  })

  if (result.status === 'blocked') return { status: 'blocked', sentAt: null }
  return { status: result.status, sentAt: result.status === 'sent' ? new Date().toISOString() : null }
}
