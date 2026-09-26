import { pgTable, text, integer } from 'drizzle-orm/pg-core'
import { users } from './users'
import { timestamps } from './timestamp'

export const budgets = pgTable('budgets', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  category: text('category').notNull(),
  amountCents: integer('amount_cents').notNull(),
  period: text('period').notNull().default('monthly'),
  currency: text('currency').notNull().default('USD'),
  ...timestamps,
})
