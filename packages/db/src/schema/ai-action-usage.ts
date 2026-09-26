import { pgTable, text, integer, uniqueIndex } from 'drizzle-orm/pg-core'
import { users } from './users'
import { timestamps } from './timestamp'

// Per-user, per-calendar-month, per-bucket AI Action counters. yearMonth is 'YYYY-MM'
// so a counter is naturally scoped to a month without a cron reset job.
export const aiActionUsage = pgTable('ai_action_usage', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  yearMonth: text('year_month').notNull(),
  bucket: text('bucket').notNull(), // 'ai' since auto mode; legacy rows are 'mid' | 'frontier'
  count: integer('count').notNull().default(0),
  inputTokens: integer('input_tokens').notNull().default(0),
  outputTokens: integer('output_tokens').notNull().default(0),
  ...timestamps,
}, (t) => [
  uniqueIndex('ai_action_usage_user_month_bucket_idx').on(t.userId, t.yearMonth, t.bucket),
])
