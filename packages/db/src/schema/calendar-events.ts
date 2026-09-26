import { boolean, integer, pgTable, text } from 'drizzle-orm/pg-core'
import { calendarConnections } from './calendar-connections'
import { contacts } from './contacts'
import { users } from './users'
import { instant, timestamps } from './timestamp'

export const calendarEvents = pgTable('calendar_events', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  allDay: boolean('all_day').notNull().default(false),
  startDate: text('start_date'),
  endDate: text('end_date'),
  startAt: instant('start_at'),
  endAt: instant('end_at'),
  timeZone: text('time_zone').notNull().default('UTC'),
  rrule: text('rrule'),
  exdates: text('exdates').default('[]'),
  alertMinutes: integer('alert_minutes').array(),
  contactId: text('contact_id').references(() => contacts.id, { onDelete: 'set null' }),
  note: text('note'),
  location: text('location'),
  source: text('source').notNull().default('native'),
  externalId: text('external_id'),
  recurringEventId: text('recurring_event_id'),
  originalStartAt: instant('original_start_at'),
  calendarConnectionId: text('calendar_connection_id').references(() => calendarConnections.id, {
    onDelete: 'set null',
  }),
  syncToGoogle: boolean('sync_to_google').notNull().default(true),
  ...timestamps,
})
