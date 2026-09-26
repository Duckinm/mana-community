import { db } from '@api/db'
import { budgets, emailLogs, transactions, users } from '@mana/db'
import { eq, and, sql } from 'drizzle-orm'
import { budgetToWire } from '@api/modules/wallets/wire'
import { createNotification } from '@api/modules/notifications/create'
import { currentCalendarMonthPrefix } from '@api/lib/calendar-date'
import { env } from '@api/env'
import { sendEmailBatch } from '@api/utils/email'
import { renderCatalogEmail } from '@api/utils/email/catalog'
import { notificationPreferenceEnabled } from '@api/modules/notifications/preferences'

const BUDGET_THRESHOLDS = [1, 0.8] as const

export async function listBudgets(userId: string) {
  const rows = await db.select().from(budgets).where(eq(budgets.userId, userId))
  return rows.map(budgetToWire)
}

export interface BudgetInput {
  category: string
  amountCents: number
  period?: string
  currency?: string
}

/**
 * Upsert a budget keyed on (category, period): a budget for the same category
 * and period is updated in place rather than duplicated. Returns the row plus
 * whether it was newly created so the route can pick the status code.
 */
export async function upsertBudget(userId: string, input: BudgetInput) {
  const period = input.period ?? 'monthly'
  const [existing] = await db
    .select({ id: budgets.id })
    .from(budgets)
    .where(and(eq(budgets.userId, userId), eq(budgets.category, input.category), eq(budgets.period, period)))
    .limit(1)

  if (existing) {
    const [row] = await db
      .update(budgets)
      .set({ amountCents: input.amountCents, updatedAt: new Date() })
      .where(eq(budgets.id, existing.id))
      .returning()
    return { created: false, budget: budgetToWire(row) }
  }

  const [row] = await db
    .insert(budgets)
    .values({
      userId,
      category: input.category,
      amountCents: input.amountCents,
      period,
      currency: input.currency ?? 'USD',
    })
    .returning()
  return { created: true, budget: budgetToWire(row) }
}

export async function patchBudget(userId: string, id: string, patch: Partial<BudgetInput>) {
  const [existing] = await db
    .select()
    .from(budgets)
    .where(and(eq(budgets.id, id), eq(budgets.userId, userId)))
    .limit(1)
  if (!existing) return null

  const [row] = await db
    .update(budgets)
    .set({
      ...(patch.category !== undefined ? { category: patch.category } : {}),
      ...(patch.amountCents !== undefined ? { amountCents: patch.amountCents } : {}),
      ...(patch.period !== undefined ? { period: patch.period } : {}),
      ...(patch.currency !== undefined ? { currency: patch.currency } : {}),
      updatedAt: new Date(),
    })
    .where(and(eq(budgets.id, id), eq(budgets.userId, userId)))
    .returning()
  return row ? budgetToWire(row) : null
}

export async function deleteBudget(userId: string, id: string): Promise<boolean> {
  const result = await db
    .delete(budgets)
    .where(and(eq(budgets.id, id), eq(budgets.userId, userId)))
    .returning({ id: budgets.id })
  return result.length > 0
}

/**
 * Notify once when an expense transaction pushes a monthly budget category
 * across the 80% or 100% spend threshold. Fires only on the transaction that
 * crosses the line (compares spend before vs. after including this write).
 */
export async function checkBudgetThreshold(
  userId: string,
  category: string,
  currentTransactionCents: number,
) {
  const [budget] = await db
    .select()
    .from(budgets)
    .where(and(eq(budgets.userId, userId), eq(budgets.category, category), eq(budgets.period, 'monthly')))
    .limit(1)
  if (!budget || budget.amountCents <= 0) return

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
  if (!user) return

  const monthPrefix = currentCalendarMonthPrefix()
  const [row] = await db
    .select({ totalCents: sql<number>`coalesce(sum(${transactions.amountCents}), 0)::int` })
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, userId),
        eq(transactions.type, 'expense'),
        eq(transactions.category, category),
        sql`${transactions.date} like ${monthPrefix + '%'}`,
      ),
    )

  const totalCents = row?.totalCents ?? 0
  const priorCents = totalCents - currentTransactionCents

  for (const threshold of BUDGET_THRESHOLDS) {
    const line = budget.amountCents * threshold
    if (priorCents < line && totalCents >= line) {
      const title = threshold >= 1 ? 'Budget exceeded' : 'Approaching budget limit'
      const percent = Math.round((totalCents / budget.amountCents) * 100)
      const event = threshold >= 1 ? 'budgetExceeded' : 'budgetApproaching'
      await createNotification({
        userId,
        title,
        body: `${category} spending is at ${percent}% of its monthly budget.`,
        key: threshold >= 1 ? 'budgetExceeded' : 'budgetWarning',
        params: { category, percent },
        link: '/accounting/budgets',
        event,
      })

      if (notificationPreferenceEnabled(user.notificationPreferences, event, 'email')) {
        const referenceId = `budget:${budget.id}:${monthPrefix}:${threshold}`
        const [existing] = await db.select({ id: emailLogs.id }).from(emailLogs).where(eq(emailLogs.referenceId, referenceId))
        if (!existing) {
          const format = (cents: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: budget.currency }).format(cents / 100)
          const rendered = await renderCatalogEmail('budget-alert', {
            recipientName: user.name || user.email.split('@')[0],
            budgetName: category,
            percentage: `${percent}%`,
            spent: format(totalCents),
            limit: format(budget.amountCents),
            actionUrl: `${env.WEB_URL}/accounting/budgets`,
          })
          const [result] = await sendEmailBatch([{ to: user.email, subject: rendered.subject, html: rendered.html }])
          await db.insert(emailLogs).values({ userId, recipient: user.email, subject: rendered.subject, type: 'budget-alert', referenceId, status: result.status, resendId: result.resendId })
        }
      }
      break
    }
  }
}
