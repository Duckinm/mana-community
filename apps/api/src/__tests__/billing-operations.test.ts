import { describe, expect, it } from 'bun:test'
import type Stripe from 'stripe'
import { createBillingOperations } from '@api/modules/billing/service'

describe('billing operations', () => {
  it('runs checkout verification through an injected Stripe client', async () => {
    const retrieved: string[] = []
    const stripe = {
      checkout: {
        sessions: {
          async retrieve(sessionId: string) {
            retrieved.push(sessionId)
            return {
              client_reference_id: 'user-1',
              metadata: null,
              status: 'open',
              subscription: null,
            }
          },
        },
      },
    } as unknown as Stripe
    const billing = createBillingOperations(() => stripe)

    expect(await billing.confirmCheckoutSession('user-1', 'cs_test')).toEqual({ complete: false })
    expect(retrieved).toEqual(['cs_test'])
    await expect(billing.confirmCheckoutSession('other-user', 'cs_other')).rejects.toMatchObject({
      statusCode: 404,
    })
  })

  it('fails closed when billing is not configured', async () => {
    const billing = createBillingOperations(() => null)

    expect(await billing.getPlanMonthlyPriceCents('mana', 'monthly')).toBeNull()
    await expect(billing.confirmCheckoutSession('user-1', 'cs_test')).rejects.toMatchObject({
      statusCode: 501,
    })
  })
})
