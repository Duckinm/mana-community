import { eq } from 'drizzle-orm'
import { transactions } from '@mana/db'
import { db } from '@api/db'

type TransactionRow = typeof transactions.$inferSelect

export async function computeLifetimeFinancialSummary(userId: string) {
  const rows = await db
    .select()
    .from(transactions)
    .where(eq(transactions.userId, userId))

  const revenueCents = rows
    .filter((r: TransactionRow) => r.type === 'revenue')
    .reduce((sum: number, r: TransactionRow) => sum + r.amountCents, 0)

  const expenseCents = rows
    .filter((r: TransactionRow) => r.type === 'expense')
    .reduce((sum: number, r: TransactionRow) => sum + r.amountCents, 0)

  const dates = rows.map((r: TransactionRow) => r.date).sort()
  let monthSpan = 1
  if (dates.length >= 2) {
    const first = new Date(dates[0])
    const last = new Date(dates[dates.length - 1])
    const diff =
      (last.getFullYear() - first.getFullYear()) * 12 + (last.getMonth() - first.getMonth())
    monthSpan = Math.max(diff, 1)
  }

  const monthlyRevenue = revenueCents / monthSpan / 100
  const monthlyExpenses = expenseCents / monthSpan / 100
  const runwayMonths = monthlyExpenses > 0 ? monthlyRevenue / monthlyExpenses : null

  return {
    totalRevenue: revenueCents / 100,
    totalExpenses: expenseCents / 100,
    netIncome: (revenueCents - expenseCents) / 100,
    monthlyAvgRevenue: Math.round(monthlyRevenue * 100) / 100,
    monthlyAvgExpenses: Math.round(monthlyExpenses * 100) / 100,
    runwayMonths: runwayMonths !== null ? Math.round(runwayMonths * 10) / 10 : null,
  }
}
