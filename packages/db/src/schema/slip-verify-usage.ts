import { pgTable, text, integer, uniqueIndex } from 'drizzle-orm/pg-core'
import { users } from './users'
import { timestamps } from './timestamp'

// Per-user, per-calendar-month counter for paid real bank-verification (Thunder Solution) calls.
export const slipVerifyUsage = pgTable('slip_verify_usage', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  yearMonth: text('year_month').notNull(),
  count: integer('count').notNull().default(0),
  ...timestamps,
}, (t) => [
  uniqueIndex('slip_verify_usage_user_month_idx').on(t.userId, t.yearMonth),
])
