import type { transactions } from '@mana/db'
import type { AmountConverter } from '@api/lib/exchange-rates'
import { buildAmountConverter } from '@api/lib/exchange-rates'

export type AggregationTransaction = Pick<
  typeof transactions.$inferSelect,
  'id' | 'amountCents' | 'currency' | 'date' | 'type' | 'category'
>

export interface MonthBucket {
  label: string
  revenue: number
  expenses: number
}

export interface CurrencyBucket {
  revenue: number
  expenses: number
}

export interface CategoryBucket {
  amount: number
  type: string
}

export interface AggregationResult {
  revenue: number
  expenses: number
  byMonth: Map<string, MonthBucket>
  byCurrency: Map<string, CurrencyBucket>
  byCategory: Map<string, CategoryBucket>
  expenseByCategory: Map<string, number>
  expenseByMonthAndCategory: Map<string, Map<string, number>>
  conversionIncomplete: boolean
  baseCurrency: string
}

export interface ConvertedTransactionAmounts {
  amounts: Map<string, number>
  baseCurrency: string
  conversionIncomplete: boolean
}

/** Converts every supplied transaction into the user's base currency once, so
 * grouped reports never add values expressed in different currencies. */
export async function convertTransactionAmounts(
  userId: string,
  rows: AggregationTransaction[],
): Promise<ConvertedTransactionAmounts> {
  const { convert, conversionIncomplete: converterIncomplete, baseCurrency } =
    await buildAmountConverter(userId, rows)
  const amounts = new Map<string, number>()
  let conversionIncomplete = converterIncomplete

  for (const row of rows) {
    const amount = convert(row.amountCents, row.currency ?? 'USD', row.date)
    if (amount == null) {
      conversionIncomplete = true
      continue
    }
    amounts.set(row.id, amount)
  }

  return { amounts, baseCurrency, conversionIncomplete }
}

function convertedAmount(
  convert: AmountConverter,
  amountCents: number,
  currency: string,
  date: string,
): number | null {
  return convert(amountCents, currency, date)
}

export async function aggregateTransactions(
  rows: AggregationTransaction[],
  convert: AmountConverter,
  baseCurrency: string,
): Promise<AggregationResult> {
  let revenue = 0
  let expenses = 0
  let conversionIncomplete = false

  const byMonth = new Map<string, MonthBucket>()
  const byCurrency = new Map<string, CurrencyBucket>()
  const byCategory = new Map<string, CategoryBucket>()
  const expenseByCategory = new Map<string, number>()
  const expenseByMonthAndCategory = new Map<string, Map<string, number>>()

  for (const row of rows) {
    const nativeAmt = row.amountCents
    const isRevenue = row.type === 'revenue'
    const currency = row.currency ?? 'USD'
    const cat = row.category || 'Uncategorized'
    const monthKey = row.date.slice(0, 7)
    const monthLabel = new Date(row.date + 'T00:00:00').toLocaleString('en-US', {
      month: 'short',
      year: 'numeric',
    })

    const converted = convertedAmount(convert, nativeAmt, currency, row.date)
    if (converted == null) {
      conversionIncomplete = true
    } else {
      if (isRevenue) revenue += converted
      else expenses += converted
    }

    const currEntry = byCurrency.get(currency) ?? { revenue: 0, expenses: 0 }
    if (isRevenue) currEntry.revenue += nativeAmt
    else currEntry.expenses += nativeAmt
    byCurrency.set(currency, currEntry)

    if (converted != null) {
      const monthEntry = byMonth.get(monthKey) ?? { label: monthLabel, revenue: 0, expenses: 0 }
      if (isRevenue) monthEntry.revenue += converted
      else monthEntry.expenses += converted
      byMonth.set(monthKey, monthEntry)

      const catEntry = byCategory.get(cat) ?? { amount: 0, type: row.type }
      catEntry.amount += converted
      byCategory.set(cat, catEntry)

      if (!isRevenue) {
        expenseByCategory.set(cat, (expenseByCategory.get(cat) ?? 0) + converted)

        const monthCategoryMap = expenseByMonthAndCategory.get(monthKey) ?? new Map<string, number>()
        monthCategoryMap.set(cat, (monthCategoryMap.get(cat) ?? 0) + converted)
        expenseByMonthAndCategory.set(monthKey, monthCategoryMap)
      }
    }
  }

  return {
    revenue,
    expenses,
    byMonth,
    byCurrency,
    byCategory,
    expenseByCategory,
    expenseByMonthAndCategory,
    conversionIncomplete,
    baseCurrency,
  }
}

export async function aggregateWithConverter(
  userId: string,
  rows: AggregationTransaction[],
): Promise<AggregationResult> {
  const { convert, conversionIncomplete: converterIncomplete, baseCurrency } =
    await buildAmountConverter(userId, rows)

  const result = await aggregateTransactions(rows, convert, baseCurrency)
  return {
    ...result,
    conversionIncomplete: result.conversionIncomplete || converterIncomplete,
  }
}
