import { pgTable, text } from 'drizzle-orm/pg-core'
import { users } from './users'
import { instant } from './timestamp'

// LINE logs — tracks outbound LINE push messages (mirrors email_logs for dedup + audit)
export const lineLogs = pgTable('line_logs', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  lineUserId: text('line_user_id').notNull(),
  type: text('type').notNull(),
  referenceId: text('reference_id'),
  status: text('status').notNull().default('sent'),
  sentAt: instant('sent_at').notNull().defaultNow(),
})
