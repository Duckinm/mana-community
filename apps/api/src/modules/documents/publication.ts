import { db } from '@api/db'
import { documents, documentItems } from '@mana/db'
import { eq, and, isNull } from 'drizzle-orm'
import { transitionDocument, type DocumentStatus } from '@api/lib/document-status'
import { r2ObjectStore } from '@api/modules/storage/object-store'
import { logActivity } from '@api/lib/activity'
import { generateDocumentPdf } from '@api/utils/pdf/generate-pdf'
import { uploadPdfToR2 } from '@api/utils/pdf/upload-pdf'
import { env } from '@api/env'
import { NotFoundError, ValidationError } from '@api/lib/errors'
import { sendDocumentEmail } from '@api/modules/documents/send-email'
import { publicDocumentAccessCondition } from '@api/modules/documents/public-link'

async function generatePdfAndStore(documentId: string, publicToken: string): Promise<void> {
  const r2Configured = !!(
    (env.R2_ENDPOINT || env.CLOUDFLARE_ACCOUNT_ID) &&
    env.R2_ACCESS_KEY_ID &&
    env.R2_SECRET_ACCESS_KEY &&
    env.R2_BUCKET_NAME
  )
  if (!r2Configured) return

  let pdf: Buffer
  try {
    pdf = await generateDocumentPdf(publicToken)
  } catch (err) {
    throw Object.assign(new Error('PDF_RENDER_FAILED'), { cause: err })
  }

  let key: string
  try {
    key = await uploadPdfToR2(documentId, pdf)
  } catch (err) {
    throw Object.assign(new Error('PDF_UPLOAD_FAILED'), { cause: err })
  }

  await db
    .update(documents)
    .set({ pdfR2Key: key, updatedAt: new Date() })
    .where(eq(documents.id, documentId))
}

type TaxInvoiceIdentity = {
  type: string | null
  vatRegistered: boolean
  registeredName: string | null
  registeredAddress: string | null
  yourTaxId: string | null
  clientName: string | null
}

/**
 * A VAT-registered INV *is* a ใบกำกับภาษี under Revenue Code s.86/4, so it must carry the
 * seller's name, address and 13-digit taxpayer ID plus the buyer's name. Issuing one
 * without them exposes the user to s.90(12) penalties, and ETDA rejects it downstream —
 * so publish is the last point where we can stop it.
 *
 * Buyer taxpayer ID is deliberately not required here: it binds only when the buyer is
 * itself a VAT registrant, and demanding it would block legitimate B2C tax invoices.
 */
export function missingTaxInvoiceFields(doc: TaxInvoiceIdentity): string[] {
  if (!doc.vatRegistered || doc.type !== 'INV') return []

  return [
    !doc.registeredName?.trim() && 'registeredName',
    !doc.registeredAddress?.trim() && 'registeredAddress',
    (doc.yourTaxId ?? '').replace(/\D/g, '').length !== 13 && 'yourTaxId',
    !doc.clientName?.trim() && 'clientName',
  ].filter((field): field is string => typeof field === 'string')
}

/**
 * Publish a draft document: marks it published, kicks off async PDF
 * generation (fire-and-forget), and optionally emails the client.
 */
export async function publishDocument(userId: string, id: string, opts: { sendEmail?: boolean } = {}) {
  const [doc] = await db
    .select()
    .from(documents)
    .where(and(eq(documents.id, id), eq(documents.userId, userId), isNull(documents.deletedAt)))

  if (!doc) throw new NotFoundError()

  const items = await db
    .select()
    .from(documentItems)
    .where(eq(documentItems.documentId, id))

  if (items.length === 0 || !doc.issueDate) {
    throw new ValidationError('cannot publish: items required and issueDate required')
  }

  const missing = missingTaxInvoiceFields(doc)
  if (missing.length > 0) {
    throw new ValidationError(`cannot publish tax invoice: missing or invalid ${missing.join(', ')}`)
  }

  const nextStatus = transitionDocument(doc.status as DocumentStatus, 'publish')

  const [updated] = await db
    .update(documents)
    .set({ status: nextStatus, pdfFailedAt: null, updatedAt: new Date() })
    .where(eq(documents.id, id))
    .returning()

  await logActivity({ userId, entityType: 'document', entityId: id, action: 'published', summaryKey: 'activity:document.published', summaryParams: { type: doc.type, number: doc.number }, contactId: doc.contactId ?? null, projectId: doc.projectId ?? null })

  generatePdfAndStore(id, updated.publicToken!).catch(async (err: unknown) => {
    const message = err instanceof Error ? err.message : String(err)
    if (message === 'PDF_RENDER_FAILED') {
      console.error('[pdf:render]', (err as { cause?: unknown }).cause ?? err)
    } else if (message === 'PDF_UPLOAD_FAILED') {
      console.error('[pdf:upload]', (err as { cause?: unknown }).cause ?? err)
    } else {
      console.error('[pdf]', err)
    }
    await db
      .update(documents)
      .set({ pdfFailedAt: new Date(), updatedAt: new Date() })
      .where(eq(documents.id, id))
  })

  let document = updated
  let emailStatus: 'sent' | 'blocked' | 'failed' | 'plan_limit' | undefined

  if (opts.sendEmail && doc.clientEmail) {
    const result = await sendDocumentEmail(userId, id)
    if (result.status !== 'no_client_email') {
      emailStatus = result.status
      if (result.status === 'sent') {
        const [refetched] = await db.select().from(documents).where(eq(documents.id, id))
        document = refetched
      }
    }
  }

  return { document, emailStatus }
}

/** Without an attachment disposition mobile browsers render the PDF inline in a new tab instead of saving it. */
function pdfAttachment(number: string) {
  return `attachment; filename="${number.replace(/["\\]/g, '')}.pdf"`
}

export async function getDocumentPdfUrl(userId: string, id: string): Promise<string | null | 'generating' | 'failed'> {
  const [doc] = await db
    .select({ pdfR2Key: documents.pdfR2Key, pdfFailedAt: documents.pdfFailedAt, userId: documents.userId, number: documents.number })
    .from(documents)
    .where(and(eq(documents.id, id), eq(documents.userId, userId), isNull(documents.deletedAt)))

  if (!doc) throw new NotFoundError()
  if (!doc.pdfR2Key) return doc.pdfFailedAt ? 'failed' : 'generating'

  return r2ObjectStore.signGet(doc.pdfR2Key, 3600, pdfAttachment(doc.number))
}

export async function getDocumentPdfUrlByToken(token: string): Promise<string | null | 'generating' | 'failed'> {
  const [doc] = await db
    .select({ pdfR2Key: documents.pdfR2Key, pdfFailedAt: documents.pdfFailedAt, number: documents.number })
    .from(documents)
    .where(publicDocumentAccessCondition(token))

  if (!doc) throw new NotFoundError()
  if (!doc.pdfR2Key) return doc.pdfFailedAt ? 'failed' : 'generating'

  return r2ObjectStore.signGet(doc.pdfR2Key, 300, pdfAttachment(doc.number))
}
