import { describe, expect, it } from 'bun:test'
import { aggregateTransactions, type AggregationTransaction } from '@api/lib/accounting-aggregation'

describe('aggregateTransactions', () => {
  it('groups converted values rather than adding native currency cents', async () => {
    const rows: AggregationTransaction[] = [
      {
        id: 'usd-revenue',
        amountCents: 10_000,
        currency: 'USD',
        date: '2026-08-01',
        type: 'revenue',
        category: 'Services',
      },
      {
        id: 'thb-revenue',
        amountCents: 3_500,
        currency: 'THB',
        date: '2026-08-01',
        type: 'revenue',
        category: 'Services',
      },
    ]

    const result = await aggregateTransactions(
      rows,
      (amount, currency) => currency === 'USD' ? amount * 35 : amount,
      'THB',
    )

    expect(result.revenue).toBe(353_500)
    expect(result.byCategory.get('Services')?.amount).toBe(353_500)
  })
})
