import { pgTable, text, integer, boolean } from 'drizzle-orm/pg-core'
import { users } from './users'
import { wallets } from './wallets'
import { documents } from './documents'
import { instant, timestamps } from './timestamp'

// Transactions table — income and expense records for the finance tracker
export const transactions = pgTable('transactions', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  type: text('type').notNull(), // 'revenue' | 'expense'
  amountCents: integer('amount_cents').notNull(),
  description: text('description').notNull(),
  category: text('category').notNull().default(''),
  date: text('date').notNull(), // 'YYYY-MM-DD'
  status: text('status').notNull().default('pending'),
  walletId: text('wallet_id').references(() => wallets.id, { onDelete: 'set null' }),
  documentId: text('document_id').references(() => documents.id, { onDelete: 'set null' }),
  projectId: text('project_id'),
  reference: text('reference'),
  notes: text('notes'),
  currency: text('currency').default('USD'),
  source: text('source').notNull().default('manual'),
  reviewedAt: instant('reviewed_at'),
  aiFlags: text('ai_flags').default('[]'), // JSON string[] of AI-uncertainty flags, e.g. 'uncertain_currency'
  isRecurring: boolean('is_recurring').default(false).notNull(),
  recurringInterval: text('recurring_interval'),
  ...timestamps,
})
