import {
  documentItems,
  documents,
  emailLogs,
  users,
  type NotificationEvent,
} from '@mana/db'
import { eq } from 'drizzle-orm'
import { db } from '@api/db'
import { env } from '@api/env'
import { sendLineNotification } from '@api/lib/line/notify'
import { sendEmailBatch } from '@api/utils/email'
import { renderCatalogEmail, type EmailTemplateId } from '@api/utils/email/catalog'
import { createNotification } from '@api/modules/notifications/create'
import { notificationPreferenceEnabled } from '@api/modules/notifications/preferences'
import { getLatestSlipStatus, listActivePaymentSlips } from '@api/modules/payment-slips/wire'
import { documentToGuestWire } from '@api/modules/documents/wire'
import { publicDocumentAccessCondition } from '@api/modules/documents/public-link'

export async function getDocumentByPublicToken(token: string, viewerId?: string | null) {
  const [document] = await db
    .select()
    .from(documents)
    .where(publicDocumentAccessCondition(token))

  if (!document) return null

  const items = await db
    .select()
    .from(documentItems)
    .where(eq(documentItems.documentId, document.id))
    .orderBy(documentItems.position)

  const [paymentSlips, latestPaymentSlipStatus] = await Promise.all([
    listActivePaymentSlips(document.id, document.userId),
    getLatestSlipStatus(document.id),
  ])

  const [owner] = await db
    .select({ hideBranding: users.hideBranding })
    .from(users)
    .where(eq(users.id, document.userId))
  const showBranding = !owner || !owner.hideBranding

  return documentToGuestWire(
    document,
    items,
    paymentSlips,
    latestPaymentSlipStatus,
    viewerId === document.userId,
    showBranding,
  )
}

const DOCUMENT_TYPE_WORD: Record<string, string> = {
  QO: 'quotation',
  INV: 'invoice',
  RC: 'receipt',
}

async function notifyDocumentActivity(input: {
  userId: string
  documentId: string
  type: string
  number: string
  templateId: EmailTemplateId
  title: string
  verb: string
  key: string
  event: NotificationEvent
}) {
  const [user] = await db.select().from(users).where(eq(users.id, input.userId))
  if (!user) return

  await createNotification({
    userId: input.userId,
    title: input.title,
    body: `${input.type} ${input.number} was ${input.verb} by the client.`,
    key: input.key,
    params: { type: input.type, number: input.number },
    link: `/documents/${input.documentId}`,
    event: input.event,
  })

  if (notificationPreferenceEnabled(user.notificationPreferences, input.event, 'email')) {
    const referenceId = `activity:${input.documentId}:${input.templateId}`
    const [existing] = await db
      .select({ id: emailLogs.id })
      .from(emailLogs)
      .where(eq(emailLogs.referenceId, referenceId))
    if (!existing) {
      const rendered = await renderCatalogEmail(input.templateId, {
        recipientName: user.name || user.email.split('@')[0],
        clientName: 'Your client',
        documentType: DOCUMENT_TYPE_WORD[input.type] ?? input.type,
        documentNumber: input.number,
        actionUrl: `${env.WEB_URL}/documents`,
      })
      const [result] = await sendEmailBatch([
        { to: user.email, subject: rendered.subject, html: rendered.html },
      ])
      await db.insert(emailLogs).values({
        userId: user.id,
        recipient: user.email,
        subject: rendered.subject,
        type: input.templateId,
        referenceId,
        status: result.status,
        resendId: result.resendId,
      })
    }
  }

  await sendLineNotification({
    userId: user.id,
    referenceId: `line:${input.documentId}:${input.templateId}`,
    type: input.templateId,
    title: input.title,
    status: `${input.type} ${input.number} was ${input.verb} by the client.`,
    url: `${env.WEB_URL}/documents/${input.documentId}`,
    event: input.event,
  })
}

export async function markDocumentViewed(token: string, viewerId?: string) {
  const [document] = await db
    .select({
      id: documents.id,
      userId: documents.userId,
      viewedAt: documents.viewedAt,
      clientStatus: documents.clientStatus,
      type: documents.type,
      number: documents.number,
    })
    .from(documents)
    .where(publicDocumentAccessCondition(token))

  if (!document) return false
  // ponytail: an owner preview is not client activity and must not notify or change status
  if (viewerId === document.userId || document.viewedAt) return true

  const alreadyActioned =
    document.clientStatus === 'client_approved' || document.clientStatus === 'client_rejected'

  await db
    .update(documents)
    .set({
      viewedAt: new Date(),
      ...(alreadyActioned ? {} : { clientStatus: 'viewed' }),
    })
    .where(eq(documents.id, document.id))

  const event =
    document.type === 'QO'
      ? 'quotationViewed'
      : document.type === 'INV'
        ? 'invoiceViewed'
        : document.type === 'RC'
          ? 'receiptViewed'
          : null
  if (event) {
    await notifyDocumentActivity({
      userId: document.userId,
      documentId: document.id,
      type: document.type,
      number: document.number,
      templateId: 'document-viewed',
      title: 'Document viewed',
      verb: 'viewed',
      key: 'documentViewed',
      event,
    })
  }

  return true
}

export async function approveDocumentByToken(token: string, ip: string): Promise<boolean> {
  const [updated] = await db
    .update(documents)
    .set({
      clientStatus: 'client_approved',
      clientApprovedAt: new Date(),
      clientApprovalIp: ip,
    })
    .where(publicDocumentAccessCondition(token))
    .returning({
      id: documents.id,
      userId: documents.userId,
      type: documents.type,
      number: documents.number,
    })
  if (!updated) return false

  if (updated.type === 'QO') {
    await notifyDocumentActivity({
      userId: updated.userId,
      documentId: updated.id,
      type: updated.type,
      number: updated.number,
      templateId: 'document-accepted',
      title: 'Document accepted',
      verb: 'accepted',
      key: 'documentAccepted',
      event: 'quotationAccepted',
    })
  }

  return true
}

export async function rejectDocumentByToken(token: string): Promise<boolean> {
  const [updated] = await db
    .update(documents)
    .set({ clientStatus: 'client_rejected' })
    .where(publicDocumentAccessCondition(token))
    .returning({
      id: documents.id,
      userId: documents.userId,
      type: documents.type,
      number: documents.number,
    })
  if (!updated) return false

  if (updated.type === 'QO') {
    await notifyDocumentActivity({
      userId: updated.userId,
      documentId: updated.id,
      type: updated.type,
      number: updated.number,
      templateId: 'document-rejected',
      title: 'Document rejected',
      verb: 'rejected',
      key: 'documentRejected',
      event: 'quotationRejected',
    })
  }

  return true
}
