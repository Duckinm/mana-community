import { pgTable, text, uniqueIndex } from 'drizzle-orm/pg-core'
import { users } from './users'
import { instant, timestamps } from './timestamp'

// LINE Messaging API connection — one row per user, linked via add-friend + webhook code exchange
export const lineConnections = pgTable(
  'line_connections',
  {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    lineUserId: text('line_user_id'),
    displayName: text('display_name'),
    linkCode: text('link_code'),
    linkCodeExpiresAt: instant('link_code_expires_at'),
    ...timestamps,
  },
  (table) => [uniqueIndex('line_connections_user_idx').on(table.userId)],
)
