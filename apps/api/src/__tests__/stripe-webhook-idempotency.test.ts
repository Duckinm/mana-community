import { describe, it, expect, afterEach } from 'bun:test'
import type Stripe from 'stripe'
import { eq } from 'drizzle-orm'
import { db } from '@api/db'
import { ledgerEntries, stripeWebhookEvents } from '@mana/db'
import { handleBillingStripeEvent } from '@api/modules/billing/stripe-events'

const createdEventIds: string[] = []

afterEach(async () => {
  for (const id of createdEventIds.splice(0)) {
    await db.delete(ledgerEntries).where(eq(ledgerEntries.stripeEventId, id))
    await db.delete(stripeWebhookEvents).where(eq(stripeWebhookEvents.id, id))
  }
})

function invoicePaidEvent(id: string): Stripe.Event {
  return {
    id,
    type: 'invoice.paid',
    created: Math.floor(Date.now() / 1000),
    data: {
      object: {
        id: 'in_test',
        number: 'INV-TEST-001',
        amount_paid: 5000,
        currency: 'usd',
        customer: 'cus_does_not_exist',
        billing_reason: 'subscription_cycle',
        attempt_count: 1,
      },
    },
  } as unknown as Stripe.Event
}

describe('handleBillingStripeEvent idempotency', () => {
  it('claims a Stripe event id once and skips reprocessing on redelivery', async () => {
    const eventId = `evt_test_${crypto.randomUUID()}`
    createdEventIds.push(eventId)
    const event = invoicePaidEvent(eventId)

    await handleBillingStripeEvent(event)
    await handleBillingStripeEvent(event)

    const claims = await db.select().from(stripeWebhookEvents).where(eq(stripeWebhookEvents.id, eventId))
    expect(claims).toHaveLength(1)

    const entries = await db.select().from(ledgerEntries).where(eq(ledgerEntries.stripeEventId, eventId))
    expect(entries).toHaveLength(1)
  })
})
