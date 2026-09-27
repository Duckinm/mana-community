import { boolean, integer, pgTable, text } from 'drizzle-orm/pg-core'
import { instant, timestamps } from '../schema/timestamp'

export const subscriptions = pgTable('subscriptions', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  plan: text('plan').notNull(),
  referenceId: text('reference_id').notNull(),
  stripeCustomerId: text('stripe_customer_id'),
  stripeSubscriptionId: text('stripe_subscription_id'),
  status: text('status').notNull().default('incomplete'),
  periodStart: instant('period_start'),
  periodEnd: instant('period_end'),
  trialStart: instant('trial_start'),
  trialEnd: instant('trial_end'),
  cancelAtPeriodEnd: boolean('cancel_at_period_end').default(false),
  cancelAt: instant('cancel_at'),
  canceledAt: instant('canceled_at'),
  endedAt: instant('ended_at'),
  seats: integer('seats'),
  billingInterval: text('billing_interval'),
  stripeScheduleId: text('stripe_schedule_id'),
  ...timestamps,
})
