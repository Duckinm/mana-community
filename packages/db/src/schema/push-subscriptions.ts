import { pgTable, text, uniqueIndex } from 'drizzle-orm/pg-core'
import { users } from './users'
import { timestamps } from './timestamp'

export const pushSubscriptions = pgTable(
  'push_subscriptions',
  {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    endpoint: text('endpoint').notNull(),
    p256dh: text('p256dh').notNull(),
    auth: text('auth').notNull(),
    userAgent: text('user_agent'),
    ...timestamps,
  },
  (t) => [uniqueIndex('push_subscriptions_user_endpoint_idx').on(t.userId, t.endpoint)],
)
