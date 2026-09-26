import { db } from '@api/db'
import { exchangeRates, users } from '@mana/db'
import { eq, and, inArray } from 'drizzle-orm'

const FRANKFURTER_BASE = 'https://api.frankfurter.app'

export type AmountConverter = (
  amountCents: number,
  fromCurrency: string,
  date: string,
) => number | null

export interface ConverterResult {
  convert: AmountConverter
  conversionIncomplete: boolean
  baseCurrency: string
}

type FetchFn = typeof fetch

interface RateItem {
  currency: string | null | undefined
  date: string
}

function normalizeCurrency(code: string | null | undefined): string {
  return code?.trim().toUpperCase() || 'USD'
}

function rateKey(base: string, quote: string, date: string): string {
  return `${base}|${quote}|${date}`
}

export async function getUserBaseCurrency(userId: string): Promise<string> {
  const [user] = await db
    .select({ currency: users.currency })
    .from(users)
    .where(eq(users.id, userId))
  return normalizeCurrency(user?.currency)
}

async function loadCachedRates(
  baseCurrency: string,
  pairs: { quote: string; date: string }[],
): Promise<Map<string, number>> {
  if (pairs.length === 0) return new Map()

  const dates = [...new Set(pairs.map((p) => p.date))]
  const quotes = [...new Set(pairs.map((p) => p.quote))]

  const rows = await db
    .select()
    .from(exchangeRates)
    .where(
      and(
        eq(exchangeRates.base, baseCurrency),
        inArray(exchangeRates.quote, quotes),
        inArray(exchangeRates.date, dates),
      ),
    )

  const map = new Map<string, number>()
  for (const row of rows) {
    map.set(rateKey(row.base, row.quote, row.date), row.rate)
  }
  return map
}

interface FrankfurterDayResponse {
  date?: string
  rates?: Record<string, number>
}

async function fetchRatesForDate(
  baseCurrency: string,
  date: string,
  quotes: string[],
  fetchFn: FetchFn,
): Promise<Record<string, number>> {
  if (quotes.length === 0) return {}

  const url = `${FRANKFURTER_BASE}/${date}?from=${baseCurrency}&to=${quotes.join(',')}`
  const res = await fetchFn(url)
  if (!res.ok) return {}

  const data = (await res.json()) as FrankfurterDayResponse
  return data.rates ?? {}
}

function groupMissingByDate(
  missing: { quote: string; date: string }[],
): Map<string, Set<string>> {
  const byDate = new Map<string, Set<string>>()
  for (const { quote, date } of missing) {
    const set = byDate.get(date) ?? new Set<string>()
    set.add(quote)
    byDate.set(date, set)
  }
  return byDate
}

async function persistRates(
  baseCurrency: string,
  requestedDate: string,
  rates: Record<string, number>,
): Promise<void> {
  const inserts = Object.entries(rates).map(([quote, rate]) => ({
    base: baseCurrency,
    quote,
    date: requestedDate,
    rate,
  }))
  if (inserts.length === 0) return

  await db
    .insert(exchangeRates)
    .values(inserts)
    .onConflictDoNothing()
}

async function resolveMissingRates(
  baseCurrency: string,
  missing: { quote: string; date: string }[],
  rateMap: Map<string, number>,
  fetchFn: FetchFn,
): Promise<void> {
  const byDate = groupMissingByDate(missing)

  for (const [date, quotesSet] of byDate) {
    const quotes = [...quotesSet]
    const dayRates = await fetchRatesForDate(baseCurrency, date, quotes, fetchFn)

    for (const quote of quotes) {
      const rate = dayRates[quote]
      if (rate == null || rate <= 0) continue
      rateMap.set(rateKey(baseCurrency, quote, date), rate)
    }

    if (Object.keys(dayRates).length > 0) {
      await persistRates(baseCurrency, date, dayRates)
    }
  }
}

export async function buildAmountConverter(
  userId: string,
  items: RateItem[],
  fetchFn: FetchFn = fetch,
): Promise<ConverterResult> {
  const baseCurrency = await getUserBaseCurrency(userId)
  return buildConverterForBase(baseCurrency, items, fetchFn)
}

/** Same conversion machinery as {@link buildAmountConverter}, but for a caller-supplied base currency instead of a user's — for reporting/aggregation contexts that aren't scoped to one user's own currency. */
export async function buildConverterForBase(
  baseCurrency: string,
  items: RateItem[],
  fetchFn: FetchFn = fetch,
): Promise<ConverterResult> {
  const pairs: { quote: string; date: string }[] = []

  for (const item of items) {
    const quote = normalizeCurrency(item.currency)
    if (quote === baseCurrency) continue
    pairs.push({ quote, date: item.date })
  }

  const uniquePairs = [...new Map(pairs.map((p) => [rateKey(baseCurrency, p.quote, p.date), p])).values()]
  const rateMap = await loadCachedRates(baseCurrency, uniquePairs)

  const missing = uniquePairs.filter(
    (p) => !rateMap.has(rateKey(baseCurrency, p.quote, p.date)),
  )

  await resolveMissingRates(baseCurrency, missing, rateMap, fetchFn)

  let conversionIncomplete = false

  const convert: AmountConverter = (amountCents, fromCurrency, date) => {
    const quote = normalizeCurrency(fromCurrency)
    if (quote === baseCurrency) return amountCents

    const rate = rateMap.get(rateKey(baseCurrency, quote, date))
    if (rate == null || rate <= 0) {
      conversionIncomplete = true
      return null
    }

    return Math.round(amountCents / rate)
  }

  for (const p of uniquePairs) {
    if (!rateMap.has(rateKey(baseCurrency, p.quote, p.date))) {
      conversionIncomplete = true
    }
  }

  return { convert, conversionIncomplete, baseCurrency }
}

export async function sumConvertedCents(
  userId: string,
  rows: { amountCents: number; currency: string | null; date: string }[],
  fetchFn?: FetchFn,
): Promise<{ total: number; conversionIncomplete: boolean; baseCurrency: string }> {
  const { convert, conversionIncomplete, baseCurrency } = await buildAmountConverter(
    userId,
    rows,
    fetchFn,
  )

  let total = 0
  for (const row of rows) {
    const converted = convert(row.amountCents, row.currency ?? 'USD', row.date)
    if (converted != null) total += converted
  }

  return { total, conversionIncomplete, baseCurrency }
}
