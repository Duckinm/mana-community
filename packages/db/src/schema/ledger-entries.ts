import { pgTable, text, integer, uniqueIndex, index } from 'drizzle-orm/pg-core'
import { timestamps } from './timestamp'

export const ledgerSources = ['stripe', 'ai', 'host', 'domain', 'db', 'other'] as const
export const ledgerDirections = ['earn', 'spend'] as const

// Money ledger (C-406): every earn/spend written as a row. `date` is a calendar
// date string (YYYY-MM-DD). `stripeEventId` makes webhook earn writes idempotent.
export const ledgerEntries = pgTable('ledger_entries', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  source: text('source').notNull(),
  direction: text('direction').notNull(),
  amountCents: integer('amount_cents').notNull(),
  currency: text('currency').notNull(),
  date: text('date').notNull(),
  note: text('note'),
  stripeEventId: text('stripe_event_id'),
  ...timestamps,
}, (t) => [
  uniqueIndex('ledger_entries_stripe_event_idx').on(t.stripeEventId),
  index('ledger_entries_date_idx').on(t.date),
])
