import type { calendarEvents } from '@mana/db'
import { addCalendarDays, toCalendarDateString } from '@api/lib/calendar-date'

type CalendarEventRow = typeof calendarEvents.$inferSelect

export const FOS_EVENT_ID_KEY = 'fosEventId'

type GoogleEventDate = {
  date?: string
  dateTime?: string
  timeZone?: string
}

export type GoogleCalendarEvent = {
  id?: string
  status?: string
  summary?: string
  description?: string
  location?: string
  start?: GoogleEventDate
  end?: GoogleEventDate
  recurrence?: string[]
  recurringEventId?: string
  originalStartTime?: GoogleEventDate
  extendedProperties?: {
    private?: Record<string, string>
  }
}

export function fosEventIdFromGoogle(event: GoogleCalendarEvent): string | null {
  return event.extendedProperties?.private?.[FOS_EVENT_ID_KEY] ?? null
}

/** `originalStart` for events.instances — must match how Google states the occurrence's own start. */
export function googleOriginalStart(allDay: boolean, at: Date): string {
  return allDay ? toCalendarDateString(at) : at.toISOString()
}

/** Google's all-day `end.date` is exclusive; MANA stores the last day of the event. */
function inclusiveEnd(startDate: string, exclusiveEnd: string | undefined): string {
  if (!exclusiveEnd) return startDate
  const last = addCalendarDays(exclusiveEnd, -1)
  return last < startDate ? startDate : last
}

export function googleEventToInsertValues(
  userId: string,
  event: GoogleCalendarEvent,
): typeof calendarEvents.$inferInsert | null {
  if (!event.id || event.status === 'cancelled') return null
  if (!event.summary?.trim()) return null

  const allDay = !!event.start?.date
  const startDate = event.start?.date ?? null
  const endDate = startDate ? inclusiveEnd(startDate, event.end?.date) : null
  const startAt = event.start?.dateTime ? new Date(event.start.dateTime) : null
  const endAt = event.end?.dateTime ? new Date(event.end.dateTime) : null

  if (allDay && !startDate) return null
  if (!allDay && !startAt) return null

  const rrule = event.recurrence?.[0]?.replace(/^RRULE:/, '') ?? null
  const originalStartAt = event.originalStartTime?.dateTime
    ? new Date(event.originalStartTime.dateTime)
    : event.originalStartTime?.date
      ? new Date(`${event.originalStartTime.date}T00:00:00`)
      : null

  return {
    userId,
    title: event.summary.trim(),
    allDay,
    startDate,
    endDate,
    startAt,
    endAt,
    timeZone: event.start?.timeZone ?? 'UTC',
    rrule,
    exdates: '[]',
    alertMinutes: null,
    contactId: null,
    note: event.description?.trim() || null,
    location: event.location?.trim() || null,
    source: 'google',
    externalId: event.id,
    recurringEventId: null,
    originalStartAt,
  }
}

export function calendarRowToGoogleEvent(row: CalendarEventRow): GoogleCalendarEvent {
  const privateProps = { [FOS_EVENT_ID_KEY]: row.id }

  if (row.allDay) {
    const startDate = row.startDate ?? undefined
    return {
      summary: row.title,
      description: row.note ?? undefined,
      location: row.location ?? undefined,
      start: { date: startDate },
      end: {
        date: startDate ? addCalendarDays(row.endDate ?? startDate, 1) : undefined,
      },
      recurrence: row.rrule ? [`RRULE:${row.rrule}`] : undefined,
      extendedProperties: { private: privateProps },
    }
  }

  return {
    summary: row.title,
    description: row.note ?? undefined,
    location: row.location ?? undefined,
    start: row.startAt
      ? { dateTime: row.startAt.toISOString(), timeZone: row.timeZone }
      : undefined,
    end: row.endAt
      ? { dateTime: row.endAt.toISOString(), timeZone: row.timeZone }
      : undefined,
    recurrence: row.rrule ? [`RRULE:${row.rrule}`] : undefined,
    extendedProperties: { private: privateProps },
  }
}

export function mergeGooglePatch(
  existing: CalendarEventRow,
  event: GoogleCalendarEvent,
): Partial<typeof calendarEvents.$inferInsert> {
  const mapped = googleEventToInsertValues(existing.userId, {
    ...event,
    id: event.id ?? existing.externalId ?? undefined,
    summary: event.summary ?? existing.title,
  })
  if (!mapped) return { updatedAt: new Date() }

  return {
    title: mapped.title,
    allDay: mapped.allDay,
    startDate: mapped.startDate,
    endDate: mapped.endDate,
    startAt: mapped.startAt,
    endAt: mapped.endAt,
    timeZone: mapped.timeZone,
    rrule: mapped.rrule,
    note: mapped.note,
    location: mapped.location,
    externalId: mapped.externalId,
    originalStartAt: mapped.originalStartAt,
    updatedAt: new Date(),
  }
}
