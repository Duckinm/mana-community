import { rrulestr } from 'rrule'
import type { calendarEvents } from '@mana/db'
import {
  getSeriesStart,
  instanceKey,
  parseExdates,
} from '@api/lib/calendar-recurrence'

type CalendarEventRow = typeof calendarEvents.$inferSelect

export type ReminderOccurrence = {
  eventId: string
  instanceStart: Date
  instanceKey: string
}

export function reminderReferenceId(eventId: string, key: string, alertMinutes: number): string {
  return `${eventId}|${key}|${alertMinutes}`
}

export function getEventStart(row: CalendarEventRow): Date {
  if (row.allDay && row.startDate) {
    return new Date(`${row.startDate}T00:00:00`)
  }
  if (row.startAt) return row.startAt
  throw new Error('Event has no start')
}

export function shouldSendReminder(
  now: Date,
  instanceStart: Date,
  alertMinutes: number,
): boolean {
  if (alertMinutes < 0) return false
  const fireAt = new Date(instanceStart.getTime() - alertMinutes * 60_000)
  // "At time of event" (0) needs a send window after start or the cron would never catch it.
  const windowEnd =
    alertMinutes === 0
      ? new Date(instanceStart.getTime() + 5 * 60_000)
      : instanceStart
  return now >= fireAt && now < windowEnd
}

export function expandOccurrences(
  row: CalendarEventRow,
  rangeStart: Date,
  rangeEnd: Date,
): ReminderOccurrence[] {
  if (row.recurringEventId || !row.rrule) {
    const start = getEventStart(row)
    if (start < rangeStart || start > rangeEnd) return []
    return [
      {
        eventId: row.id,
        instanceStart: start,
        instanceKey: instanceKey(row.allDay, start),
      },
    ]
  }

  const dtstart = getSeriesStart(row)
  const rule = rrulestr(row.rrule, { dtstart })
  const exdates = new Set(parseExdates(row.exdates))
  const dates = rule.between(rangeStart, rangeEnd, true)

  return dates
    .filter((date) => !exdates.has(instanceKey(row.allDay, date)))
    .map((date) => ({
      eventId: row.id,
      instanceStart: date,
      instanceKey: instanceKey(row.allDay, date),
    }))
}

export function formatReminderWhen(row: CalendarEventRow, instanceStart: Date): string {
  if (row.allDay) {
    return instanceStart.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }
  return instanceStart.toLocaleString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function noteSnippet(note: string | null | undefined, maxLength = 160): string | null {
  if (!note?.trim()) return null
  const trimmed = note.trim()
  if (trimmed.length <= maxLength) return trimmed
  return `${trimmed.slice(0, maxLength - 1)}…`
}
