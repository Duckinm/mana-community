import { documents, emailLogs } from '@mana/db'
import { and, eq, inArray } from 'drizzle-orm'
import { db } from '@api/db'
import { env } from '@api/env'
import { sendEmailBatch } from '@api/utils/email'
import { renderCatalogEmail } from '@api/utils/email/catalog'
import { formatCalendarDate } from '@api/lib/calendar-date'
import { createNotification } from '@api/modules/notifications/create'

export async function sendReminders(userId: string, documentIds: string[]) {
  const reminders = await db
    .select()
    .from(documents)
    .where(and(eq(documents.userId, userId), eq(documents.type, 'INV'), inArray(documents.id, documentIds)))

  const payloads = await Promise.all(reminders.filter((document) => document.clientEmail).map(async (document) => {
    const email = await renderCatalogEmail('payment-reminder', {
      recipientName: document.clientName ?? 'there',
      senderName: document.registeredName ?? document.registeredNameEn ?? 'MANA',
      documentNumber: document.number,
      currency: document.currency,
      amount: (document.amountDueCents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      date: document.dueDate ? formatCalendarDate(document.dueDate, 'd MMMM yyyy') : 'now',
      actionUrl: `${env.WEB_URL}/view/${document.publicToken}`,
    })
    return { document, to: document.clientEmail!, ...email }
  }))

  const results = await sendEmailBatch(payloads.map(({ to, subject, html }) => ({ to, subject, html })))

  if (results.length) {
    await db.insert(emailLogs).values(results.map((result, index) => ({
      userId,
      recipient: result.to,
      subject: payloads[index].subject,
      type: 'invoice_reminder',
      referenceId: payloads[index].document.id,
      status: result.status,
      resendId: result.resendId,
    })))
  }

  const sentCount = results.filter((result) => result.status === 'sent').length
  if (sentCount > 0) {
    await createNotification({
      userId,
      title: 'Invoice reminders sent',
      body: `${sentCount} payment reminder${sentCount === 1 ? '' : 's'} sent.`,
      key: 'remindersSent',
      params: { count: sentCount },
      link: '/documents',
      event: 'invoiceReminderSent',
    })
  }

  return results
}
