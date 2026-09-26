import { pgTable, text, unique } from 'drizzle-orm/pg-core'
import { accounts } from './auth'
import { users } from './users'
import { instant, timestamps } from './timestamp'

export const calendarConnections = pgTable(
  'calendar_connections',
  {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    provider: text('provider').notNull().default('google'),
    accountId: text('account_id')
      .notNull()
      .references(() => accounts.id, { onDelete: 'cascade' }),
    calendarId: text('calendar_id'),
    calendarName: text('calendar_name'),
    accountEmail: text('account_email'),
    syncToken: text('sync_token'),
    channelId: text('channel_id'),
    channelResourceId: text('channel_resource_id'),
    channelExpiresAt: instant('channel_expires_at'),
    lastSyncedAt: instant('last_synced_at'),
    ...timestamps,
  },
  (table) => [
    unique('calendar_connections_user_provider_account_calendar_idx')
      .on(table.userId, table.provider, table.accountId, table.calendarId)
      .nullsNotDistinct(),
  ],
)
