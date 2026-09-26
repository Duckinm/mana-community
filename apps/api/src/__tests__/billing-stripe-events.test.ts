import { describe, expect, it } from 'bun:test'
import type Stripe from 'stripe'
import { emailTemplateForStripeEvent, isEntitledSubscriptionStatus } from '@api/modules/billing/stripe-events'
import { isDeferredPlanChange, isPlanDowngrade } from '@api/modules/billing/service'

describe('Stripe billing email classification', () => {
  it('keeps retry-grace subscriptions entitled but cuts off terminal payment states', () => {
    expect(isEntitledSubscriptionStatus('active')).toBe(true)
    expect(isEntitledSubscriptionStatus('trialing')).toBe(true)
    expect(isEntitledSubscriptionStatus('past_due')).toBe(true)
    expect(isEntitledSubscriptionStatus('incomplete')).toBe(false)
    expect(isEntitledSubscriptionStatus('unpaid')).toBe(false)
    expect(isEntitledSubscriptionStatus('paused')).toBe(false)
    expect(isEntitledSubscriptionStatus('canceled')).toBe(false)
  })

  it('classifies scheduled cancellation and resumption from Stripe previous attributes', () => {
    expect(emailTemplateForStripeEvent(subscriptionEvent(false, true))).toBe('cancellation-scheduled')
    expect(emailTemplateForStripeEvent(subscriptionEvent(true, false))).toBe('cancellation-resumed')
  })

  it('classifies failed, action-required, activation, and recovered invoice events', () => {
    expect(emailTemplateForStripeEvent(invoiceEvent('invoice.payment_failed'))).toBe('payment-failed')
    expect(emailTemplateForStripeEvent(invoiceEvent('invoice.payment_action_required'))).toBe('payment-action-required')
    expect(emailTemplateForStripeEvent(invoiceEvent('invoice.paid', 'subscription_create', 1))).toBe('subscription-started')
    expect(emailTemplateForStripeEvent(invoiceEvent('invoice.paid', 'subscription_cycle', 2))).toBe('payment-recovered')
    expect(emailTemplateForStripeEvent(invoiceEvent('invoice.paid', 'subscription_cycle', 1))).toBeNull()
  })

  it('defers only a lower plan tier', () => {
    expect(isPlanDowngrade('aether', 'mana')).toBe(true)
    expect(isPlanDowngrade('mana', 'aether')).toBe(false)
    expect(isPlanDowngrade('aether', 'aether')).toBe(false)
  })

  it('applies the complete plan and commitment transition policy', () => {
    expect(isDeferredPlanChange('mana', 'monthly', 'aether', 'monthly')).toBe(false)
    expect(isDeferredPlanChange('mana', 'monthly', 'mana', 'annual')).toBe(false)
    expect(isDeferredPlanChange('aether', 'monthly', 'mana', 'monthly')).toBe(true)
    expect(isDeferredPlanChange('aether', 'monthly', 'mana', 'annual')).toBe(true)
    expect(isDeferredPlanChange('aether', 'annual', 'aether', 'monthly')).toBe(true)
    expect(isDeferredPlanChange('mana', 'annual', 'aether', 'monthly')).toBe(true)
  })
})

function subscriptionEvent(previous: boolean, current: boolean): Stripe.CustomerSubscriptionUpdatedEvent {
  return {
    id: 'evt_subscription',
    type: 'customer.subscription.updated',
    data: {
      object: { cancel_at_period_end: current, items: { data: [{ price: { id: 'price_pro' } }] } },
      previous_attributes: { cancel_at_period_end: previous },
    },
  } as unknown as Stripe.CustomerSubscriptionUpdatedEvent
}

function invoiceEvent(type: 'invoice.payment_failed' | 'invoice.payment_action_required' | 'invoice.paid', billingReason: Stripe.Invoice.BillingReason | null = null, attemptCount = 1): Stripe.Event {
  return {
    id: 'evt_invoice',
    type,
    data: { object: { billing_reason: billingReason, attempt_count: attemptCount } },
  } as unknown as Stripe.Event
}
