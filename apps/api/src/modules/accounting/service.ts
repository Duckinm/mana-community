import { db } from '@api/db'
import { transactions, budgets, projects, tasks, storageFiles, documents } from '@mana/db'
import { eq, and, gte, lte, count, isNull, isNotNull, inArray } from 'drizzle-orm'
import { aggregateWithConverter } from '@api/lib/accounting-aggregation'
import { buildAmountConverter, buildConverterForBase, sumConvertedCents } from '@api/lib/exchange-rates'
import { estimateThaiIncomeTax } from '@api/lib/thai-pit'
import { todayCalendarDate, toCalendarDateString, addCalendarDays, addCalendarMonths } from '@api/lib/calendar-date'
import { getOverdueTasks, getTasksDueThisWeek } from '@api/utils/mcp-tools/projects'

/** Normalizes a recurring amount to its monthly equivalent for MRR/forecast math. */
function toMonthlyAmount(amountCents: number, recurringInterval: string | null): number {
  switch (recurringInterval) {
    case 'weekly': return Math.round((amountCents * 52) / 12)
    case 'quarterly': return Math.round(amountCents / 3)
    case 'yearly': return Math.round(amountCents / 12)
    default: return amountCents
  }
}

/**
 * PIT is annual and progressive, so the estimate is always the calendar year to
 * date — never the selected period. A single month's net run through annual
 * brackets would land in the 0% band and read as "no tax owed" all year.
 *
 * Computed in baht because the brackets are baht, then expressed in whatever
 * currency the rest of the summary is in.
 */
async function estimateAnnualTax(
  userId: string,
  baseCurrency: string,
): Promise<{ tax: number; incomplete: boolean }> {
  const year = new Date().getFullYear()
  const rows = await db
    .select()
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, userId),
        gte(transactions.date, `${year}-01-01`),
        lte(transactions.date, `${year}-12-31`),
      ),
    )

  if (rows.length === 0) return { tax: 0, incomplete: false }

  const items = rows.map((r) => ({ currency: r.currency ?? 'USD', date: r.date }))
  const toBaht = await buildConverterForBase('THB', items)

  let netBaht = 0
  for (const row of rows) {
    const converted = toBaht.convert(row.amountCents, row.currency ?? 'USD', row.date)
    if (converted == null) continue
    netBaht += row.type === 'revenue' ? converted : -converted
  }

  const taxBaht = estimateThaiIncomeTax(netBaht)
  if (taxBaht === 0 || baseCurrency === 'THB') {
    return { tax: taxBaht, incomplete: toBaht.conversionIncomplete }
  }

  const today = todayCalendarDate()
  const fromBaht = await buildConverterForBase(baseCurrency, [{ currency: 'THB', date: today }])
  const converted = fromBaht.convert(taxBaht, 'THB', today)

  // A tax we cannot express in the display currency is reported as unknown, not
  // as zero — zero is the exact lie this estimate used to tell.
  return {
    tax: converted ?? 0,
    incomplete: toBaht.conversionIncomplete || converted == null,
  }
}

export function getPeriodRange(period: string): { from: Date; to: Date } {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()

  switch (period) {
    case 'last_month': {
      const from = new Date(year, month - 1, 1)
      const to = new Date(year, month, 0, 23, 59, 59, 999)
      return { from, to }
    }
    case 'quarter': {
      const quarterStart = Math.floor(month / 3) * 3
      const from = new Date(year, quarterStart, 1)
      const to = new Date(year, quarterStart + 3, 0, 23, 59, 59, 999)
      return { from, to }
    }
    case 'year': {
      const from = new Date(year, 0, 1)
      const to = new Date(year, 11, 31, 23, 59, 59, 999)
      return { from, to }
    }
    case 'all': {
      return { from: new Date(0), to: new Date(8640000000000000) }
    }
    case 'month':
    default: {
      const from = new Date(year, month, 1)
      const to = new Date(year, month + 1, 0, 23, 59, 59, 999)
      return { from, to }
    }
  }
}

export async function getAccountingSummary(userId: string, period: string) {
  const { from, to } = getPeriodRange(period)
  const fromStr = toCalendarDateString(from)
  const toStr = toCalendarDateString(to)

  const rows = await db
    .select()
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, userId),
        gte(transactions.date, fromStr),
        lte(transactions.date, toStr),
      ),
    )

  const agg = await aggregateWithConverter(userId, rows)
  const { revenue, expenses, baseCurrency, conversionIncomplete } = agg

  const net = revenue - expenses
  const { tax: taxEstimate, incomplete: taxConversionIncomplete } = await estimateAnnualTax(
    userId,
    baseCurrency,
  )

  const byCurrency = Array.from(agg.byCurrency.entries()).map(([currency, v]) => ({
    currency,
    revenue: v.revenue,
    expenses: v.expenses,
    net: v.revenue - v.expenses,
  }))

  const byMonth = Array.from(agg.byMonth.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, v]) => ({
      month: v.label,
      revenue: v.revenue,
      expenses: v.expenses,
    }))

  const byCategory = Array.from(agg.byCategory.entries()).map(([category, v]) => ({
    category,
    amount: v.amount,
    type: v.type,
  }))

  return {
    revenue,
    expenses,
    net,
    taxEstimate,
    baseCurrency,
    conversionIncomplete: conversionIncomplete || taxConversionIncomplete,
    byCurrency,
    byMonth,
    byCategory,
  }
}

export async function getChartData(userId: string) {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()

  const from = new Date(year, month - 11, 1)
  const fromStr = toCalendarDateString(from)
  const toStr = toCalendarDateString(now)

  const rows = await db
    .select()
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, userId),
        gte(transactions.date, fromStr),
        lte(transactions.date, toStr),
      ),
    )

  const monthlyMap = new Map<string, { amount: number }>()
  for (let i = 11; i >= 0; i--) {
    const d = new Date(year, month - i, 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    monthlyMap.set(key, { amount: 0 })
  }

  const agg = await aggregateWithConverter(userId, rows)

  for (const [monthKey, bucket] of agg.byMonth) {
    const entry = monthlyMap.get(monthKey)
    if (entry) entry.amount += bucket.revenue
  }

  const monthlyIncome = Array.from(monthlyMap.entries()).map(([key, v]) => ({
    month: key,
    amount: v.amount,
  }))

  const expensesByCategory = Array.from(agg.expenseByCategory.entries())
    .sort(([, a], [, b]) => b - a)
    .slice(0, 8)
    .map(([category, amount]) => ({ category, amount }))

  const currentMonthStart = toCalendarDateString(new Date(year, month, 1))
  const currentMonthEnd = toCalendarDateString(new Date(year, month + 1, 0))

  const thisMonthExpenses = rows.filter(
    r => r.type === 'expense' && r.date >= currentMonthStart && r.date <= currentMonthEnd,
  )

  const { convert, conversionIncomplete: budgetConversionIncomplete } =
    await buildAmountConverter(userId, thisMonthExpenses)

  const actualByCategory = new Map<string, number>()
  for (const row of thisMonthExpenses) {
    const cat = row.category || 'Uncategorized'
    const converted = convert(row.amountCents, row.currency ?? 'USD', row.date)
    if (converted == null) continue
    actualByCategory.set(cat, (actualByCategory.get(cat) ?? 0) + converted)
  }

  const userBudgets = await db.select().from(budgets).where(eq(budgets.userId, userId))

  const budgetVsActual = userBudgets.map(b => ({
    category: b.category,
    budget: b.amountCents,
    actual: actualByCategory.get(b.category) ?? 0,
  }))

  const trendMonths: string[] = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date(year, month - i, 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    trendMonths.push(key)
  }

  const budgetUtilizationTrend = trendMonths.map(key => {
    const monthExpenses = agg.expenseByMonthAndCategory.get(key)

    const categories = userBudgets.map(b => {
      const actual = monthExpenses?.get(b.category) ?? 0
      const percent = b.amountCents === 0 ? 0 : Math.round((actual / b.amountCents) * 100)
      return { category: b.category, percent }
    })

    return { month: key, categories }
  })

  return {
    monthlyIncome,
    expensesByCategory,
    budgetVsActual,
    budgetUtilizationTrend,
    baseCurrency: agg.baseCurrency,
    conversionIncomplete: agg.conversionIncomplete || budgetConversionIncomplete,
  }
}

export async function getRecurringTransactions(userId: string) {
  const rows = await db
    .select()
    .from(transactions)
    .where(and(eq(transactions.userId, userId), eq(transactions.isRecurring, true)))

  const recurringRevenue = rows.filter(r => r.type === 'revenue')
  const recurringExpenses = rows.filter(r => r.type === 'expense')

  const today = todayCalendarDate()
  const { convert, conversionIncomplete, baseCurrency } =
    await buildAmountConverter(userId, rows.map(r => ({ currency: r.currency, date: r.date || today })))

  let mrr = 0
  for (const r of recurringRevenue) {
    const monthly = toMonthlyAmount(r.amountCents, r.recurringInterval)
    const converted = convert(monthly, r.currency ?? 'USD', r.date || today)
    if (converted != null) mrr += converted
  }

  return {
    recurringRevenue: recurringRevenue.map(r => ({
      id: r.id,
      description: r.description,
      amountCents: r.amountCents,
      recurringInterval: r.recurringInterval,
      category: r.category,
      currency: r.currency ?? 'USD',
    })),
    recurringExpenses: recurringExpenses.map(r => ({
      id: r.id,
      description: r.description,
      amountCents: r.amountCents,
      recurringInterval: r.recurringInterval,
      category: r.category,
      currency: r.currency ?? 'USD',
    })),
    mrr,
    baseCurrency,
    conversionIncomplete,
  }
}

export async function getCashFlowForecast(userId: string) {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()

  const recurringRows = await db
    .select()
    .from(transactions)
    .where(and(eq(transactions.userId, userId), eq(transactions.isRecurring, true)))

  // Recurring invoices are the feature that actually bills on a schedule, so a
  // retainer set up there has to reach MRR too — not just recurring transactions.
  // Matches the generator's own filter, since a template it skips bills nothing.
  const recurringInvoices = await db
    .select()
    .from(documents)
    .where(
      and(
        eq(documents.userId, userId),
        eq(documents.type, 'INV'),
        eq(documents.isRecurring, true),
        isNotNull(documents.nextGenerationDate),
        isNull(documents.deletedAt),
      ),
    )

  const today = todayCalendarDate()
  const { convert, conversionIncomplete: mrrIncomplete, baseCurrency } =
    await buildAmountConverter(userId, [
      ...recurringRows.map(r => ({ currency: r.currency, date: r.date || today })),
      ...recurringInvoices.map(d => ({ currency: d.currency, date: today })),
    ])

  let mrr = 0
  for (const r of recurringRows.filter(row => row.type === 'revenue')) {
    const monthly = toMonthlyAmount(r.amountCents, r.recurringInterval)
    const converted = convert(monthly, r.currency ?? 'USD', r.date || today)
    if (converted != null) mrr += converted
  }
  for (const d of recurringInvoices) {
    // amountDue, not total: withheld tax never lands in the bank.
    const monthly = toMonthlyAmount(d.amountDueCents, d.recurringInterval)
    const converted = convert(monthly, d.currency ?? 'USD', today)
    if (converted != null) mrr += converted
  }

  const from = new Date(year, month - 3, 1)
  const to = new Date(year, month, 0)
  const fromStr = toCalendarDateString(from)
  const toStr = toCalendarDateString(to)

  const expenseRows = await db
    .select()
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, userId),
        eq(transactions.type, 'expense'),
        gte(transactions.date, fromStr),
        lte(transactions.date, toStr),
      ),
    )

  const { total: totalExpenses, conversionIncomplete: expenseIncomplete } =
    await sumConvertedCents(userId, expenseRows)

  const avgMonthlyExpenses = Math.round(totalExpenses / 3)
  const projectedNet = mrr - avgMonthlyExpenses

  const forecastDate = new Date(year, month + 1, 1)
  const forecastMonth = `${forecastDate.getFullYear()}-${String(forecastDate.getMonth() + 1).padStart(2, '0')}`

  return {
    mrr,
    avgMonthlyExpenses,
    projectedNet,
    forecastMonth,
    baseCurrency,
    conversionIncomplete: mrrIncomplete || expenseIncomplete,
    // The window is the three whole months before this one, so a new account has
    // nothing in it. Without this the UI reads a measured average of zero and
    // calls the outlook healthy on an account that has never logged a cost.
    hasExpenseHistory: expenseRows.length > 0,
  }
}

export async function getRevenueThisQuarter(userId: string) {
  const today = todayCalendarDate()
  const year = today.slice(0, 4)
  const month = Number(today.slice(5, 7))
  const quarter = Math.floor((month - 1) / 3) + 1
  const quarterStartMonth = (quarter - 1) * 3 + 1
  const quarterEndMonth = quarterStartMonth + 2
  const quarterStart = `${year}-${String(quarterStartMonth).padStart(2, '0')}-01`
  const quarterEnd = `${year}-${String(quarterEndMonth).padStart(2, '0')}-31`

  const rows = await db
    .select()
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, userId),
        eq(transactions.type, 'revenue'),
        gte(transactions.date, quarterStart),
        lte(transactions.date, quarterEnd),
      ),
    )

  const { total, conversionIncomplete, baseCurrency } = await sumConvertedCents(userId, rows)

  return {
    quarter,
    year: Number(year),
    quarterStart,
    quarterEnd,
    totalRevenue: total / 100,
    baseCurrency,
    conversionIncomplete,
  }
}

export async function getDashboardSnapshot(userId: string) {
  const today = todayCalendarDate()
  const currentMonth = today.slice(0, 7)
  const monthStart = `${currentMonth}-01`
  const monthEnd = addCalendarDays(addCalendarMonths(monthStart, 1), -1)

  const monthTransactions = await db
    .select()
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, userId),
        gte(transactions.date, monthStart),
        lte(transactions.date, monthEnd),
      ),
    )

  const [
    activeProjectsResult,
    openTasksResult,
    overdueTasks,
    tasksDueThisWeek,
    fileCountResult,
    revenueSum,
    expenseSum,
  ] = await Promise.all([
    db.select({ count: count() }).from(projects)
      .where(and(eq(projects.userId, userId), eq(projects.archived, false), isNull(projects.deletedAt))),
    db.select({ count: count() }).from(tasks)
      .where(and(eq(tasks.userId, userId), inArray(tasks.status, ['todo', 'in-progress']))),
    getOverdueTasks(userId),
    getTasksDueThisWeek(userId),
    db.select({ count: count() }).from(storageFiles).where(eq(storageFiles.userId, userId)),
    sumConvertedCents(
      userId,
      monthTransactions.filter(r => r.type === 'revenue'),
    ),
    sumConvertedCents(
      userId,
      monthTransactions.filter(r => r.type === 'expense'),
    ),
  ])

  const upcomingTasks = tasksDueThisWeek.map((t) => ({ id: t.id, title: t.title, projectId: t.projectId, due: t.due }))

  const thisMonthRevenueCents = revenueSum.total
  const thisMonthExpensesCents = expenseSum.total

  return {
    activeProjects: activeProjectsResult[0]?.count ?? 0,
    openTasks: openTasksResult[0]?.count ?? 0,
    overdueTasks: overdueTasks.length,
    thisMonthRevenue: thisMonthRevenueCents / 100,
    thisMonthExpenses: thisMonthExpensesCents / 100,
    thisMonthNet: (thisMonthRevenueCents - thisMonthExpensesCents) / 100,
    upcomingTasks,
    totalFiles: fileCountResult[0]?.count ?? 0,
    baseCurrency: revenueSum.baseCurrency,
    conversionIncomplete: revenueSum.conversionIncomplete || expenseSum.conversionIncomplete,
  }
}
