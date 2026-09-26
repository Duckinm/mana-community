import { createInsertSchema, createUpdateSchema } from 'drizzle-typebox'
import { t } from 'elysia'
import { calendarEvents } from '@mana/db'

// startAt/endAt arrive as ISO strings; the service converts to Date.
const calendarEventRefine = {
  startAt: t.Optional(t.Nullable(t.String())),
  endAt: t.Optional(t.Nullable(t.String())),
}

const serverManagedFields = [
  'id',
  'userId',
  'exdates',
  'source',
  'externalId',
  'recurringEventId',
  'originalStartAt',
  'createdAt',
  'updatedAt',
] as const

const _eventInsert = createInsertSchema(calendarEvents, {
  ...calendarEventRefine,
  allDay: t.Boolean(),
})
export const CreateCalendarEventBody = t.Omit(_eventInsert, [...serverManagedFields])

const _eventUpdate = createUpdateSchema(calendarEvents, calendarEventRefine)
export const UpdateCalendarEventBody = t.Omit(_eventUpdate, [...serverManagedFields])
