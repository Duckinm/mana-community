import { t } from 'elysia'

export { CreateCalendarEventBody, UpdateCalendarEventBody } from '@api/lib/db-schema'

export const CalendarEventsQuery = t.Object({
  start: t.String(),
  end: t.String(),
})

export const CalendarScopeQuery = t.Object({
  scope: t.Optional(t.Union([t.Literal('single'), t.Literal('following'), t.Literal('all')])),
  instanceStart: t.Optional(t.String()),
})

export const SelectGoogleCalendarBody = t.Object({
  accountId: t.String(),
  calendarId: t.String(),
  calendarName: t.String(),
  accountEmail: t.Optional(t.String()),
})
