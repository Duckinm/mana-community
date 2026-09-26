export const CURRENCIES = ['THB', 'USD'] as const

export const CURRENCY_SYMBOLS: Record<string, string> = {
  THB: '฿',
  USD: '$',
}

export const RATE_RANGES = [
  { id: 'under-500', min: 0, max: 500 },
  { id: '500-1000', min: 500, max: 1000 },
  { id: '1000-2000', min: 1000, max: 2000 },
  { id: '2000-5000', min: 2000, max: 5000 },
  { id: '5000-10000', min: 5000, max: 10000 },
  { id: '10000-plus', min: 10000, max: null as number | null },
]

export function formatRateRange(id: string, symbol: string): string {
  const range = RATE_RANGES.find((r) => r.id === id)
  if (!range) return id
  return range.max
    ? `${symbol}${range.min.toLocaleString()}–${range.max.toLocaleString()}`
    : `${symbol}${range.min.toLocaleString()}+`
}

// Typical billable hours/month for a freelancer (not full-time employment hours),
// used only to filter out revenue goals below what the selected rate could realistically reach
const BILLABLE_HOURS_PER_MONTH = 40

export const REVENUE_GOALS = [
  { id: '15000', amount: 15000 },
  { id: '30000', amount: 30000 },
  { id: '50000', amount: 50000 },
  { id: '80000', amount: 80000 },
  { id: '120000', amount: 120000 },
  { id: '200000', amount: 200000 },
  { id: '350000', amount: 350000 },
  { id: '500000', amount: 500000 },
]

const MIN_REVENUE_GOALS = 3

export function availableRevenueGoals(rateId: string) {
  const range = RATE_RANGES.find((r) => r.id === rateId)
  const floor = range ? range.min * BILLABLE_HOURS_PER_MONTH : 0
  const filtered = REVENUE_GOALS.filter((g) => g.amount >= floor)
  return filtered.length >= MIN_REVENUE_GOALS ? filtered : REVENUE_GOALS.slice(-MIN_REVENUE_GOALS)
}
