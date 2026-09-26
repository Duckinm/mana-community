import { describe, expect, it } from 'vitest'
import {
  clampDiscountCents,
  discountCentsFromPercent,
  discountPercentFromCents,
} from '@/components/documents/wizard/line-items/discount'

describe('document discounts', () => {
  it('rounds percentage discounts to integer cents', () => {
    expect(discountCentsFromPercent(7.5, 9_999)).toBe(750)
    expect(discountPercentFromCents(750, 9_999)).toBe('7.5')
  })

  it('caps discounts between zero and the subtotal', () => {
    expect(discountCentsFromPercent(150, 10_000)).toBe(10_000)
    expect(clampDiscountCents(12_000, 10_000)).toBe(10_000)
    expect(clampDiscountCents(-1, 10_000)).toBe(0)
  })
})
