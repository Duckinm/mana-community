import { describe, it, expect } from 'bun:test'

const mockRates: Record<string, Record<string, number>> = {
  '2026-01-15': { THB: 35, EUR: 0.92 },
  '2026-03-01': { THB: 34, GBP: 0.79 },
}

const mockFetch = (async (url: string | URL | Request) => {
  const href = typeof url === 'string' ? url : url instanceof URL ? url.href : url.url
  const match = href.match(/\/(\d{4}-\d{2}-\d{2})\?from=(\w+)&to=([\w,]+)/)
  if (!match) {
    return new Response(JSON.stringify({ rates: {} }), { status: 404 })
  }

  const [, date, base, quotesRaw] = match
  const quotes = quotesRaw.split(',')
  const dayRates = mockRates[date] ?? {}
  const rates: Record<string, number> = {}

  for (const quote of quotes) {
    if (dayRates[quote] != null) rates[quote] = dayRates[quote]
  }

  return new Response(JSON.stringify({ amount: 1, base, date, rates }), { status: 200 })
}) as typeof fetch

describe('buildAmountConverter', () => {
  it('converts foreign currency to base using fetched rates', async () => {
    const { buildAmountConverter } = await import('@api/lib/exchange-rates')

    const db = await import('@api/db')
    const originalSelect = db.db.select.bind(db.db)
    let selectCall = 0

    db.db.select = ((..._args: unknown[]) => {
      selectCall++
      if (selectCall === 1) {
        return {
          from: () => ({
            where: () => Promise.resolve([{ currency: 'USD' }]),
          }),
        }
      }
      return {
        from: () => ({
          where: () => Promise.resolve([]),
        }),
      }
    }) as unknown as typeof db.db.select

    const originalInsert = db.db.insert.bind(db.db)
    db.db.insert = ((() => ({
      values: () => ({
        onConflictDoNothing: () => Promise.resolve(),
      }),
    })) as unknown) as typeof db.db.insert

    try {
      const { convert, baseCurrency, conversionIncomplete } = await buildAmountConverter(
        'user-1',
        [{ currency: 'THB', date: '2026-01-15' }],
        mockFetch,
      )

      expect(baseCurrency).toBe('USD')
      expect(conversionIncomplete).toBe(false)
      expect(convert(3500, 'THB', '2026-01-15')).toBe(100)
      expect(convert(500, 'USD', '2026-01-15')).toBe(500)
    } finally {
      db.db.select = originalSelect
      db.db.insert = originalInsert
    }
  })

  it('returns null and flags incomplete when rate is unavailable', async () => {
    const { buildAmountConverter } = await import('@api/lib/exchange-rates')

    const db = await import('@api/db')
    const originalSelect = db.db.select.bind(db.db)

    db.db.select = ((() => ({
      from: () => ({
        where: () => Promise.resolve([{ currency: 'USD' }]),
      }),
    })) as unknown) as typeof db.db.select

    const originalInsert = db.db.insert.bind(db.db)
    db.db.insert = ((() => ({
      values: () => ({
        onConflictDoNothing: () => Promise.resolve(),
      }),
    })) as unknown) as typeof db.db.insert

    try {
      const { convert, conversionIncomplete } = await buildAmountConverter(
        'user-1',
        [{ currency: 'XYZ', date: '2026-01-15' }],
        mockFetch,
      )

      expect(convert(1000, 'XYZ', '2026-01-15')).toBeNull()
      expect(conversionIncomplete).toBe(true)
    } finally {
      db.db.select = originalSelect
      db.db.insert = originalInsert
    }
  })
})
