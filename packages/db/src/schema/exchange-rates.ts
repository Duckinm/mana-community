import { pgTable, text, doublePrecision, uniqueIndex } from 'drizzle-orm/pg-core'
import { timestamps } from './timestamp'

export const exchangeRates = pgTable(
  'exchange_rates',
  {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    base: text('base').notNull(),
    quote: text('quote').notNull(),
    date: text('date').notNull(),
    rate: doublePrecision('rate').notNull(),
    ...timestamps,
  },
  (t) => [uniqueIndex('exchange_rates_base_quote_date_idx').on(t.base, t.quote, t.date)],
)
