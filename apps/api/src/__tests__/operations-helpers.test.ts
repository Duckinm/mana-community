import { describe, expect, it } from 'bun:test'
import {
  providerState,
  resourceState,
  summarizePayments,
  summarizeSubscriptions,
} from '@api/modules/operations/helpers'

describe('operations provider helpers', () => {
  it('summarizes Stripe subscription and 30-day payment samples', () => {
    expect(summarizeSubscriptions([
      { status: 'active' },
      { status: 'trialing' },
      { status: 'past_due' },
      { status: 'canceled' },
    ], true)).toEqual({ active: 1, trialing: 1, pastDue: 1, other: 1, hasMore: true })

    expect(summarizePayments([
      { status: 'succeeded', amountReceived: 1200, currency: 'thb', hasError: false },
      { status: 'succeeded', amountReceived: 300, currency: 'thb', hasError: false },
      { status: 'requires_payment_method', amountReceived: 0, currency: 'usd', hasError: true },
    ], false)).toEqual({
      succeeded: 2,
      failed: 1,
      volume: [{ currency: 'THB', amount: 1500 }],
      hasMore: false,
    })
  })

  it('distinguishes provider transport failures from unhealthy resources', () => {
    expect(providerState([
      { status: 'fulfilled', value: null },
      { status: 'rejected', reason: new Error('offline') },
    ])).toBe('degraded')
    expect(providerState([
      { status: 'rejected', reason: new Error('offline') },
    ])).toBe('unavailable')
    expect(resourceState([{ state: 'started' }], new Set(['started']))).toBe('ready')
    expect(resourceState([{ state: 'stopped' }], new Set(['started']))).toBe('degraded')
  })
})
