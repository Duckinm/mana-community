import { pgTable, text } from 'drizzle-orm/pg-core'
import { users } from './users'
import { instant } from './timestamp'

// Email logs — tracks all outbound reminder emails (sandbox mode enforces whitelist)
export const emailLogs = pgTable('email_logs', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  recipient: text('recipient').notNull(),
  subject: text('subject').notNull(),
  type: text('type').notNull(),
  referenceId: text('reference_id'),
  status: text('status').notNull().default('sent'),
  sentAt: instant('sent_at').notNull().defaultNow(),
  resendId: text('resend_id'),
})
