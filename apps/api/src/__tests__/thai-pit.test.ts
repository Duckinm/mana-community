import { describe, it, expect } from 'bun:test'
import { estimateThaiIncomeTax } from '@api/lib/thai-pit'

const baht = (n: number) => n * 100

describe('estimateThaiIncomeTax', () => {
  it('owes nothing below the personal allowance', () => {
    expect(estimateThaiIncomeTax(baht(50_000))).toBe(0)
    expect(estimateThaiIncomeTax(0)).toBe(0)
    expect(estimateThaiIncomeTax(baht(-20_000))).toBe(0)
  })

  it('owes nothing at the top of the exempt band', () => {
    // 210,000 − 60,000 allowance = 150,000, the last baht taxed at 0%.
    expect(estimateThaiIncomeTax(baht(210_000))).toBe(0)
  })

  it('taxes the first baht past the exempt band at 5%', () => {
    expect(estimateThaiIncomeTax(baht(310_000))).toBe(baht(5_000))
  })

  it('stacks brackets rather than applying one rate to the whole amount', () => {
    // 560,000 − 60,000 = 500,000 taxable:
    //   150,000 @ 0% = 0 · 150,000 @ 5% = 7,500 · 200,000 @ 10% = 20,000
    expect(estimateThaiIncomeTax(baht(560_000))).toBe(baht(27_500))
  })

  it('reaches the top bracket', () => {
    // 5,060,000 − 60,000 = 5,000,000 taxable: 0 + 7,500 + 20,000 + 37,500
    //   + 50,000 + 250,000 + 900,000 = 1,265,000
    expect(estimateThaiIncomeTax(baht(5_060_000))).toBe(baht(1_265_000))
    // Every baht above that is 35%.
    expect(estimateThaiIncomeTax(baht(6_060_000))).toBe(baht(1_265_000 + 350_000))
  })

  it('is never harsher than the flat 25% it replaced, for the freelancers it is for', () => {
    // The defect this fixes: a first-year freelancer netting 38,800 was told
    // she owed 9,700. She owes nothing.
    expect(estimateThaiIncomeTax(baht(38_800))).toBe(0)
  })

  it('rises monotonically', () => {
    let previous = 0
    for (let net = 0; net <= 8_000_000; net += 50_000) {
      const tax = estimateThaiIncomeTax(baht(net))
      expect(tax).toBeGreaterThanOrEqual(previous)
      expect(tax).toBeLessThan(baht(net) + 1)
      previous = tax
    }
  })
})
