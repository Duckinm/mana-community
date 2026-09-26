import { pgTable, text } from 'drizzle-orm/pg-core'
import { instant } from './timestamp'

// Whole-event dedupe gate for Stripe webhooks, checked before any handler logic runs.
// The id IS the Stripe event id, so a redelivered event can never insert a second row —
// this sits alongside (not instead of) the existing per-effect idempotency in
// ledgerEntries.stripeEventId and emailLogs.referenceId.
export const stripeWebhookEvents = pgTable('stripe_webhook_events', {
  id: text('id').primaryKey(),
  processedAt: instant('processed_at').notNull().defaultNow(),
})
