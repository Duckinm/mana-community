import { t } from 'elysia'
import { IsoInstant, NullableIsoInstant, NullableString, NotFoundResponse } from '@api/lib/wire-schema'

export const CalendarEventResponse = t.Object({
  id: t.String(),
  title: t.String(),
  allDay: t.Boolean(),
  startDate: NullableString,
  endDate: NullableString,
  startAt: NullableIsoInstant,
  endAt: NullableIsoInstant,
  timeZone: t.String(),
  rrule: NullableString,
  exdates: t.Array(t.String()),
  recurringEventId: NullableString,
  originalStartAt: NullableIsoInstant,
  alertMinutes: t.Union([t.Array(t.Number()), t.Null()]),
  contactId: NullableString,
  contactName: NullableString,
  contactEmail: NullableString,
  note: NullableString,
  location: NullableString,
  source: t.String(),
  calendarConnectionId: NullableString,
  syncToGoogle: t.Boolean(),
  accountEmail: NullableString,
  calendarName: NullableString,
  createdAt: IsoInstant,
  updatedAt: IsoInstant,
  googleSyncFailed: t.Optional(t.Boolean()),
})

export const CalendarEventsListResponse = t.Array(CalendarEventResponse)

export const CalendarOverlayResponse = t.Object({
  id: t.String(),
  kind: t.Union([t.Literal('milestone'), t.Literal('document')]),
  title: t.String(),
  date: t.String(),
  projectId: NullableString,
  documentId: NullableString,
  documentType: NullableString,
  documentStatus: t.Union([t.Literal('published'), t.Literal('overdue'), t.Null()]),
  documentDateKind: t.Union([
    t.Literal('invoiceDue'),
    t.Literal('quoteExpiry'),
    t.Literal('recurringGeneration'),
    t.Null(),
  ]),
  urgency: t.Union([
    t.Literal('normal'),
    t.Literal('dueSoon'),
    t.Literal('overdue'),
    t.Literal('expired'),
    t.Null(),
  ]),
})

export const CalendarOverlaysListResponse = t.Array(CalendarOverlayResponse)

export const CalendarConnectionItemResponse = t.Object({
  id: t.String(),
  accountId: t.String(),
  calendarId: t.String(),
  calendarName: NullableString,
  accountEmail: NullableString,
  lastSyncedAt: NullableIsoInstant,
})

export const CalendarConnectionResponse = t.Object({
  connected: t.Boolean(),
  calendars: t.Array(CalendarConnectionItemResponse),
  limit: t.Union([t.Number(), t.Null()]),
  oauthConfigured: t.Boolean(),
})

export const GoogleCalendarListItemResponse = t.Object({
  id: t.String(),
  name: t.String(),
  primary: t.Boolean(),
})

export const GoogleCalendarAccountGroupResponse = t.Object({
  accountId: t.String(),
  accountEmail: t.String(),
  calendars: t.Array(GoogleCalendarListItemResponse),
  error: t.Optional(t.Boolean()),
})

export const GoogleCalendarsListResponse = t.Array(GoogleCalendarAccountGroupResponse)

export const CalendarSyncResponse = t.Object({
  imported: t.Number(),
  skipped: t.Boolean(),
})

export { NotFoundResponse }
