import { describe, it, expect, afterEach } from 'bun:test'
import { db } from '@api/db'
import { users, documents, transactions } from '@mana/db'
import { eq } from 'drizzle-orm'
import { getCashFlowForecast } from '@api/modules/accounting/service'
import { todayCalendarDate } from '@api/lib/calendar-date'

async function createUser() {
  const [user] = await db
    .insert(users)
    .values({ name: 'Test User', email: `forecast-${crypto.randomUUID()}@example.com`, currency: 'THB' })
    .returning()
  return user
}

const createdUserIds: string[] = []

afterEach(async () => {
  for (const userId of createdUserIds.splice(0)) {
    await db.delete(transactions).where(eq(transactions.userId, userId))
    await db.delete(documents).where(eq(documents.userId, userId))
    await db.delete(users).where(eq(users.id, userId))
  }
})

describe('getCashFlowForecast', () => {
  it('counts a recurring invoice toward MRR', async () => {
    const user = await createUser()
    createdUserIds.push(user.id)

    await db.insert(documents).values({
      userId: user.id,
      type: 'INV',
      status: 'published',
      number: 'INV-FORECAST-001',
      currency: 'THB',
      totalCents: 10000000,
      amountDueCents: 9700000,
      isRecurring: true,
      recurringInterval: 'monthly',
      nextGenerationDate: '2026-09-01',
    })

    const forecast = await getCashFlowForecast(user.id)

    // amountDue, not total: the 3% withheld never reaches the bank.
    expect(forecast.mrr).toBe(9700000)
  })

  it('normalizes a yearly recurring invoice to its monthly share', async () => {
    const user = await createUser()
    createdUserIds.push(user.id)

    await db.insert(documents).values({
      userId: user.id,
      type: 'INV',
      status: 'published',
      number: 'INV-FORECAST-002',
      currency: 'THB',
      totalCents: 1200000,
      amountDueCents: 1200000,
      isRecurring: true,
      recurringInterval: 'yearly',
      nextGenerationDate: '2027-01-01',
    })

    const forecast = await getCashFlowForecast(user.id)

    expect(forecast.mrr).toBe(100000)
  })

  it('ignores a recurring invoice the generator would skip', async () => {
    const user = await createUser()
    createdUserIds.push(user.id)

    await db.insert(documents).values({
      userId: user.id,
      type: 'INV',
      status: 'published',
      number: 'INV-FORECAST-003',
      currency: 'THB',
      totalCents: 5000000,
      amountDueCents: 5000000,
      isRecurring: true,
      recurringInterval: 'monthly',
      nextGenerationDate: null,
    })

    const forecast = await getCashFlowForecast(user.id)

    expect(forecast.mrr).toBe(0)
  })

  it('reports zero for an account with nothing recorded', async () => {
    const user = await createUser()
    createdUserIds.push(user.id)

    const forecast = await getCashFlowForecast(user.id)

    expect(forecast.mrr).toBe(0)
    expect(forecast.avgMonthlyExpenses).toBe(0)
    expect(forecast.projectedNet).toBe(0)
    expect(forecast.hasExpenseHistory).toBe(false)
  })

  it('does not pass off an empty expense window as an average of zero', async () => {
    const user = await createUser()
    createdUserIds.push(user.id)

    // Dated today, so it falls outside the window — which is the three whole
    // months before this one. A brand-new account has expenses and no history.
    await db.insert(transactions).values({
      userId: user.id,
      type: 'expense',
      status: 'paid',
      description: 'SaaS subscription',
      amountCents: 130000,
      currency: 'THB',
      date: todayCalendarDate(),
    })

    const forecast = await getCashFlowForecast(user.id)

    expect(forecast.avgMonthlyExpenses).toBe(0)
    expect(forecast.hasExpenseHistory).toBe(false)
  })
})
