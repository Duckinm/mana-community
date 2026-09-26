import Elysia, { t } from 'elysia'
import { documents, emailLogs, users, type NotificationEvent } from '@mana/db'
import { eq } from 'drizzle-orm'
import { Resend, type WebhookEventPayload } from 'resend'
import { db } from '@api/db'
import { env } from '@api/env'
import { sendEmailBatch } from '@api/utils/email'
import { renderCatalogEmail } from '@api/utils/email/catalog'
import { logDocumentEmailed } from '@api/lib/activity'
import { notificationPreferenceEnabled } from '@api/modules/notifications/preferences'

const resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null

export const emailDeliveryModule = new Elysia({ name: 'email-delivery', prefix: '/api/email' })
  .post('/webhook', async ({ body, request, status }) => {
    if (!resend || !env.RESEND_WEBHOOK_SECRET) return status(501, { error: 'Email delivery webhook is not configured' })
    const id = request.headers.get('svix-id')
    const timestamp = request.headers.get('svix-timestamp')
    const signature = request.headers.get('svix-signature')
    if (!id || !timestamp || !signature) return status(400, { error: 'Missing webhook signature' })

    let event: WebhookEventPayload
    try {
      event = resend.webhooks.verify({ payload: body, headers: { id, timestamp, signature }, webhookSecret: env.RESEND_WEBHOOK_SECRET })
    } catch {
      return status(400, { error: 'Invalid webhook signature' })
    }

    if (!event.type.startsWith('email.') || !('email_id' in event.data)) return { received: true }
    const deliveryStatus = statusForEvent(event.type)
    if (!deliveryStatus) return { received: true }

    const [log] = await db.select().from(emailLogs).where(eq(emailLogs.resendId, event.data.email_id))
    if (!log) return { received: true }
    if (log.status === deliveryStatus) return { received: true }
    await db.update(emailLogs).set({ status: deliveryStatus }).where(eq(emailLogs.id, log.id))

    if (deliveryStatus === 'delivered' && log.type === 'document_sent' && log.referenceId) {
      const [document] = await db.select().from(documents).where(eq(documents.id, log.referenceId))
      if (document) {
        const deliveredAt = new Date(event.created_at)
        await db.update(documents).set({ sentAt: deliveredAt, updatedAt: new Date() }).where(eq(documents.id, document.id))
        logDocumentEmailed(document, log.userId)
      }
    }

    if (['bounced', 'failed', 'suppressed'].includes(deliveryStatus) && ['document_sent', 'invoice_reminder', 'etax_sent'].includes(log.type)) {
      const [user] = await db.select().from(users).where(eq(users.id, log.userId))
      if (user) {
        const failed = await deliveryFailureTarget(log.type, log.referenceId)
        if (failed.event && !notificationPreferenceEnabled(user.notificationPreferences, failed.event, 'email')) {
          return { received: true }
        }
        const rendered = await renderCatalogEmail('delivery-failed', {
          recipientName: user.name || user.email.split('@')[0],
          documentNumber: failed.number ?? log.subject,
          reason: failureReason(event),
          actionUrl: `${env.WEB_URL}/documents`,
        })
        const [result] = await sendEmailBatch([{ to: user.email, subject: rendered.subject, html: rendered.html }])
        await db.insert(emailLogs).values({ userId: user.id, recipient: user.email, subject: rendered.subject, type: 'delivery-failed', referenceId: `resend:${event.data.email_id}`, status: result.status, resendId: result.resendId })
      }
    }
    return { received: true }
  }, {
    parse: 'text',
    body: t.String(),
    detail: { tags: ['Email'], summary: 'Receive verified Resend delivery events' },
  })

async function deliveryFailureTarget(
  logType: string,
  referenceId: string | null,
): Promise<{ event: NotificationEvent | null; number: string | null }> {
  const [document] = referenceId
    ? await db
        .select({ type: documents.type, number: documents.number })
        .from(documents)
        .where(eq(documents.id, referenceId))
    : []
  const number = document?.number ?? null
  if (logType === 'invoice_reminder') return { event: 'invoiceDeliveryFailed', number }
  if (document?.type === 'QO') return { event: 'quotationDeliveryFailed', number }
  if (document?.type === 'INV') return { event: 'invoiceDeliveryFailed', number }
  if (document?.type === 'RC') return { event: 'receiptDeliveryFailed', number }
  return { event: null, number }
}

function statusForEvent(type: WebhookEventPayload['type']) {
  const statuses: Partial<Record<WebhookEventPayload['type'], string>> = {
    'email.sent': 'accepted',
    'email.delivered': 'delivered',
    'email.delivery_delayed': 'accepted',
    'email.complained': 'complained',
    'email.bounced': 'bounced',
    'email.failed': 'failed',
    'email.suppressed': 'suppressed',
  }
  return statuses[type]
}

function failureReason(event: WebhookEventPayload) {
  if (event.type === 'email.bounced') return event.data.bounce.message
  if (event.type === 'email.failed') return event.data.failed.reason
  if (event.type === 'email.suppressed') return event.data.suppressed.message
  return 'The provider could not deliver the message.'
}
