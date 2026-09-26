import { describe, it, expect } from 'bun:test'
import { getPeriodRange } from '@api/modules/accounting/service'

describe('getPeriodRange', () => {
  it('returns the current calendar month for "month"', () => {
    const now = new Date()
    const { from, to } = getPeriodRange('month')
    expect(from.getFullYear()).toBe(now.getFullYear())
    expect(from.getMonth()).toBe(now.getMonth())
    expect(from.getDate()).toBe(1)
    expect(to.getMonth()).toBe(now.getMonth())
  })

  it('defaults to the current month for an unknown period string', () => {
    const month = getPeriodRange('month')
    const unknown = getPeriodRange('not-a-real-period')
    expect(unknown.from.getTime()).toBe(month.from.getTime())
    expect(unknown.to.getTime()).toBe(month.to.getTime())
  })

  it('returns the prior calendar month for "last_month"', () => {
    const now = new Date()
    const { from, to } = getPeriodRange('last_month')
    const expectedMonth = (now.getMonth() - 1 + 12) % 12
    expect(from.getMonth()).toBe(expectedMonth)
    expect(to.getMonth()).toBe(expectedMonth)
    expect(from.getDate()).toBe(1)
  })

  it('rolls "last_month" across a year boundary in January', () => {
    // getPeriodRange uses the real current date, so this only verifies
    // the boundary math holds whenever "now" happens to be January.
    const now = new Date()
    if (now.getMonth() !== 0) return
    const { from } = getPeriodRange('last_month')
    expect(from.getFullYear()).toBe(now.getFullYear() - 1)
    expect(from.getMonth()).toBe(11)
  })

  it('spans exactly 3 months for "quarter"', () => {
    const { from, to } = getPeriodRange('quarter')
    expect(from.getDate()).toBe(1)
    expect(from.getMonth() % 3).toBe(0)
    const monthSpan = (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth())
    expect(monthSpan).toBe(2)
  })

  it('spans the full calendar year for "year"', () => {
    const now = new Date()
    const { from, to } = getPeriodRange('year')
    expect(from.getFullYear()).toBe(now.getFullYear())
    expect(from.getMonth()).toBe(0)
    expect(from.getDate()).toBe(1)
    expect(to.getMonth()).toBe(11)
    expect(to.getDate()).toBe(31)
  })

  it('spans effectively all time for "all"', () => {
    const { from, to } = getPeriodRange('all')
    expect(from.getTime()).toBe(0)
    expect(to.getFullYear()).toBeGreaterThan(new Date().getFullYear() + 1000)
  })

  it('"to" is always after "from"', () => {
    for (const period of ['month', 'last_month', 'quarter', 'year', 'all']) {
      const { from, to } = getPeriodRange(period)
      expect(to.getTime()).toBeGreaterThan(from.getTime())
    }
  })
})
