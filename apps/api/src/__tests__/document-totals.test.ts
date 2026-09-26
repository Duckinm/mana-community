import { describe, it, expect } from 'bun:test'
import { computeDocumentTotals } from '@api/lib/document-totals'

describe('computeDocumentTotals', () => {
  it('computes subtotal, tax, wht and amount due', () => {
    const result = computeDocumentTotals({
      items: [{ subtotalCents: 10000 }],
      taxRateBps: 700,
      discountCents: 0,
      whtRateBps: 300,
    })
    expect(result).toEqual({
      subtotalCents: 10000,
      taxCents: 700,
      totalCents: 10700,
      whtCents: 300,
      amountDueCents: 10400,
    })
  })

  it('clamps a discount larger than the subtotal instead of going negative', () => {
    const result = computeDocumentTotals({
      items: [{ subtotalCents: 5000 }],
      taxRateBps: 700,
      discountCents: 9000,
      whtRateBps: 0,
    })
    expect(result).toEqual({
      subtotalCents: 5000,
      taxCents: 0,
      totalCents: 0,
      whtCents: 0,
      amountDueCents: 0,
    })
  })

  it('floors amount due at 0 when WHT exceeds the total', () => {
    const result = computeDocumentTotals({
      items: [{ subtotalCents: 10000 }],
      taxRateBps: 0,
      discountCents: 0,
      whtRateBps: 15000,
    })
    expect(result.totalCents).toBe(10000)
    expect(result.whtCents).toBe(15000)
    expect(result.amountDueCents).toBe(0)
  })
})
