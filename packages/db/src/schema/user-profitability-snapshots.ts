import { pgTable, text, integer, doublePrecision, index, uniqueIndex } from 'drizzle-orm/pg-core'
import { users } from './users'
import { timestamps } from './timestamp'

// Nightly snapshot of estimated per-user profit (C-387 Financial Report). One batch of rows
// per snapshotDate (YYYY-MM-DD); the API reads/paginates/sorts the latest batch directly
// instead of recomputing plan pricing + AI usage + FX on every request.
export const userProfitabilitySnapshots = pgTable('user_profitability_snapshots', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  snapshotDate: text('snapshot_date').notNull(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  email: text('email').notNull(),
  plan: text('plan').notNull(),
  billingInterval: text('billing_interval'),
  subscriptionStatus: text('subscription_status'),
  estimatedMonthlyRevenueCents: integer('estimated_monthly_revenue_cents').notNull(),
  currency: text('currency'),
  aiCostUsd: doublePrecision('ai_cost_usd').notNull(),
  reportingCurrency: text('reporting_currency').notNull(),
  estimatedMonthlyRevenueReportingCents: integer('estimated_monthly_revenue_reporting_cents').notNull(),
  aiCostReportingCents: integer('ai_cost_reporting_cents').notNull(),
  estimatedProfitReportingCents: integer('estimated_profit_reporting_cents').notNull(),
  ...timestamps,
}, (t) => [
  uniqueIndex('user_profitability_snapshots_date_user_idx').on(t.snapshotDate, t.userId),
  index('user_profitability_snapshots_date_profit_idx').on(t.snapshotDate, t.estimatedProfitReportingCents),
])
