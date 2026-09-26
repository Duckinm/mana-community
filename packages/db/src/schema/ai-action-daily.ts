import { pgTable, text, integer, uniqueIndex } from 'drizzle-orm/pg-core'
import { users } from './users'
import { timestamps } from './timestamp'

// Per-user, per-UTC-day AI Action counters, for the usage heatmap. day is 'YYYY-MM-DD' (UTC),
// matching the UTC monthly reset used by ai_action_usage.
export const aiActionDaily = pgTable('ai_action_daily', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  day: text('day').notNull(), // 'YYYY-MM-DD' UTC
  count: integer('count').notNull().default(0),
  inputTokens: integer('input_tokens').notNull().default(0),
  outputTokens: integer('output_tokens').notNull().default(0),
  ...timestamps,
}, (t) => [
  uniqueIndex('ai_action_daily_user_day_idx').on(t.userId, t.day),
])
