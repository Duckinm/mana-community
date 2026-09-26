import type { calendarEvents } from '@mana/db'
import { formatReminderWhen, noteSnippet, type ReminderOccurrence } from '@api/lib/calendar-reminder'
import { renderCatalogEmail } from '@api/utils/email/catalog'

type CalendarEventRow = typeof calendarEvents.$inferSelect

export function buildCalendarReminderEmailHtml(input: {
  event: CalendarEventRow
  occurrence: ReminderOccurrence
  ownerName: string
  attendeeName: string | null
}) {
  return renderCatalogEmail('calendar-reminder', {
    recipientName: input.ownerName,
    eventTitle: input.event.title,
    date: formatReminderWhen(input.event, input.occurrence.instanceStart),
    location: input.event.location?.trim() || undefined,
    attendeeName: input.attendeeName ?? undefined,
    note: noteSnippet(input.event.note) ?? undefined,
  })
}
