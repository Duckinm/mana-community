import { db } from '@api/db'
import { calendarEvents, contacts, emailLogs, users, type NotificationPreferences } from '@mana/db'
import { and, eq, inArray, isNotNull } from 'drizzle-orm'
import {
  expandOccurrences,
  reminderReferenceId,
  shouldSendReminder,
} from '@api/lib/calendar-reminder'
import { buildCalendarReminderEmailHtml } from '@api/utils/email/calendar-reminder-email'
import { sendEmailBatch } from '@api/utils/email'
import { createNotification } from '@api/modules/notifications/create'
import { notificationPreferenceEnabled } from '@api/modules/notifications/preferences'

const HORIZON_MS = 7 * 24 * 60 * 60 * 1000

type ReminderCandidate = {
  event: typeof calendarEvents.$inferSelect
  ownerEmail: string
  ownerName: string
  ownerNotificationPreferences: NotificationPreferences
  attendeeName: string | null
  occurrence: ReturnType<typeof expandOccurrences>[number]
  referenceId: string
}

export async function sendCalendarReminders(now = new Date()) {
  const horizon = new Date(now.getTime() + HORIZON_MS)

  const rows = await db
    .select({
      event: calendarEvents,
      ownerEmail: users.email,
      ownerName: users.name,
      ownerNotificationPreferences: users.notificationPreferences,
      attendeeName: contacts.name,
    })
    .from(calendarEvents)
    .innerJoin(users, eq(calendarEvents.userId, users.id))
    .leftJoin(contacts, eq(calendarEvents.contactId, contacts.id))
    .where(isNotNull(calendarEvents.alertMinutes))

  const candidates: ReminderCandidate[] = []

  for (const row of rows) {
    const alertList = (row.event.alertMinutes ?? []).filter((minutes) => minutes >= 0)
    if (alertList.length === 0) continue

    const occurrences = expandOccurrences(row.event, now, horizon)
    for (const occurrence of occurrences) {
      for (const alertMinutes of alertList) {
        if (!shouldSendReminder(now, occurrence.instanceStart, alertMinutes)) continue
        candidates.push({
          event: row.event,
          ownerEmail: row.ownerEmail,
          ownerName: row.ownerName,
          ownerNotificationPreferences: row.ownerNotificationPreferences,
          attendeeName: row.attendeeName,
          occurrence,
          referenceId: reminderReferenceId(row.event.id, occurrence.instanceKey, alertMinutes),
        })
      }
    }
  }

  if (candidates.length === 0) {
    return { checked: rows.length, sent: 0, skipped: 0, blocked: 0, failed: 0 }
  }

  const referenceIds = candidates.map((item) => item.referenceId)
  const existingRows = await db
    .select({ referenceId: emailLogs.referenceId })
    .from(emailLogs)
    .where(
      and(
        eq(emailLogs.type, 'calendar_reminder'),
        inArray(emailLogs.referenceId, referenceIds),
        inArray(emailLogs.status, ['sent', 'blocked']),
      ),
    )

  const alreadySent = new Set(
    existingRows.map((row) => row.referenceId).filter((value): value is string => !!value),
  )

  const pending = candidates.filter((item) => !alreadySent.has(item.referenceId))
  if (pending.length === 0) {
    return {
      checked: rows.length,
      sent: 0,
      skipped: candidates.length,
      blocked: 0,
      failed: 0,
    }
  }

  const payloads = await Promise.all(pending.map(async (item) => {
    const { subject, html } = await buildCalendarReminderEmailHtml({
      event: item.event,
      occurrence: item.occurrence,
      ownerName: item.ownerName,
      attendeeName: item.attendeeName,
    })
    return {
      to: item.ownerEmail,
      subject,
      html,
      userId: item.event.userId,
      referenceId: item.referenceId,
      eventTitle: item.event.title,
      notificationPreferences: item.ownerNotificationPreferences,
    }
  }))

  const emailPayloads = payloads.filter((payload) =>
    notificationPreferenceEnabled(payload.notificationPreferences, 'calendarReminder', 'email'),
  )
  const emailResults = await sendEmailBatch(emailPayloads.map(({ to, subject, html }) => ({ to, subject, html })))
  let emailResultIndex = 0
  const results = payloads.map((payload) => {
    if (!notificationPreferenceEnabled(payload.notificationPreferences, 'calendarReminder', 'email')) {
      return { to: payload.to, status: 'blocked' as const }
    }
    return emailResults[emailResultIndex++]
  })

  await db.insert(emailLogs).values(
    results.map((result, index) => ({
      userId: payloads[index].userId,
      recipient: result.to,
      subject: payloads[index].subject,
      type: 'calendar_reminder',
      referenceId: payloads[index].referenceId,
      status: result.status,
      resendId: result.resendId,
    })),
  )

  await Promise.all(
    results.map((result, index) => {
      const payload = payloads[index]
      const emailEnabled = notificationPreferenceEnabled(payload.notificationPreferences, 'calendarReminder', 'email')
      if (result.status !== 'sent' && emailEnabled) return
      return createNotification({
        userId: payload.userId,
        title: 'Upcoming event reminder',
        body: payload.eventTitle,
        key: 'eventReminder',
        params: { eventTitle: payload.eventTitle },
        link: '/calendar',
        event: 'calendarReminder',
      })
    }),
  )

  return {
    checked: rows.length,
    sent: results.filter((result) => result.status === 'sent').length,
    skipped: candidates.length - pending.length,
    blocked: results.filter((result) => result.status === 'blocked').length,
    failed: results.filter((result) => result.status === 'failed').length,
  }
}
