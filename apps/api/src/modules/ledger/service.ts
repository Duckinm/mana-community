import { aiActionUsage, ledgerEntries, users, userProfitabilitySnapshots } from '@mana/db'
import { and, asc, desc, eq, sql, gte, lte } from 'drizzle-orm'
import type Stripe from 'stripe'
import { db } from '@api/db'
import { todayCalendarDate } from '@api/lib/calendar-date'
import { buildConverterForBase } from '@api/lib/exchange-rates'
import {
  getPlanMonthlyPriceCents,
  isEntitledSubscriptionStatus,
  type BillingInterval,
} from '@api/modules/billing/service'
import { estimateAiCostUsd } from '@api/modules/billing/usage'

export type ProfitabilitySort = 'revenue' | 'cost' | 'profit'

export type LedgerGranularity = 'day' | 'week' | 'month'

type LedgerRow = typeof ledgerEntries.$inferSelect

function toWire(row: LedgerRow) {
  return {
    id: row.id,
    source: row.source,
    direction: row.direction,
    amountCents: row.amountCents,
    currency: row.currency,
    date: row.date,
    note: row.note,
    stripeEventId: row.stripeEventId,
    createdAt: row.createdAt.toISOString(),
  }
}

function dateRange(from?: string, to?: string) {
  const conditions = [
    ...(from ? [gte(ledgerEntries.date, from)] : []),
    ...(to ? [lte(ledgerEntries.date, to)] : []),
  ]
  return conditions.length ? and(...conditions) : undefined
}

export async function listLedgerEntries(from?: string, to?: string) {
  const rows = await db
    .select()
    .from(ledgerEntries)
    .where(dateRange(from, to))
    .orderBy(desc(ledgerEntries.date), desc(ledgerEntries.createdAt))
    .limit(500)
  return { entries: rows.map(toWire) }
}

export async function createLedgerEntry(input: {
  source: string
  direction: string
  amountCents: number
  currency: string
  date: string
  note?: string
}) {
  const [row] = await db
    .insert(ledgerEntries)
    .values({
      source: input.source,
      direction: input.direction,
      amountCents: input.amountCents,
      currency: input.currency.toLowerCase(),
      date: input.date,
      note: input.note || null,
    })
    .returning()
  return toWire(row)
}

export async function deleteLedgerEntry(id: string) {
  const rows = await db.delete(ledgerEntries).where(eq(ledgerEntries.id, id)).returning({ id: ledgerEntries.id })
  return rows.length > 0
}

/** Estimated AI spend for the current calendar month from recorded tokens (C-408) — reconciles against the provider invoice. Sums every bucket row (legacy 'mid'/'frontier' plus the current single 'ai' bucket). */
async function currentMonthAiEstimateUsd(): Promise<number> {
  const now = new Date()
  const yearMonth = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`
  const [row] = await db
    .select({
      inputTokens: sql<number>`coalesce(sum(${aiActionUsage.inputTokens}), 0)::int`,
      outputTokens: sql<number>`coalesce(sum(${aiActionUsage.outputTokens}), 0)::int`,
    })
    .from(aiActionUsage)
    .where(eq(aiActionUsage.yearMonth, yearMonth))
  return estimateAiCostUsd(row?.inputTokens ?? 0, row?.outputTokens ?? 0)
}

// ponytail: sums assume a single currency; group by currency if multi-currency revenue ever happens.
export async function getLedgerSummary(granularity: LedgerGranularity, from?: string, to?: string) {
  const where = dateRange(from, to)
  const period = sql<string>`to_char(date_trunc(${granularity}, ${ledgerEntries.date}::date), 'YYYY-MM-DD')`
  const earned = sql<number>`coalesce(sum(${ledgerEntries.amountCents}) filter (where ${ledgerEntries.direction} = 'earn'), 0)::int`
  const spent = sql<number>`coalesce(sum(${ledgerEntries.amountCents}) filter (where ${ledgerEntries.direction} = 'spend'), 0)::int`

  const [periods, [totals], aiCostEstimateUsd] = await Promise.all([
    db
      .select({ period, earnedCents: earned, spentCents: spent })
      .from(ledgerEntries)
      .where(where)
      // ordinal refs: repeating the date_trunc fragment re-parameterizes $n, which Postgres
      // then rejects as an ungrouped expression (42803)
      .groupBy(sql`1`)
      .orderBy(sql`1 desc`)
      .limit(60),
    db
      .select({
        earnedCents: earned,
        spentCents: spent,
        spendMonths: sql<number>`coalesce(count(distinct date_trunc('month', ${ledgerEntries.date}::date)) filter (where ${ledgerEntries.direction} = 'spend'), 0)::int`,
        currencies: sql<string[]>`coalesce(array_agg(distinct ${ledgerEntries.currency}), '{}')`,
      })
      .from(ledgerEntries)
      .where(where),
    currentMonthAiEstimateUsd(),
  ])

  return {
    granularity,
    periods,
    totals: {
      earnedCents: totals?.earnedCents ?? 0,
      spentCents: totals?.spentCents ?? 0,
      netCents: (totals?.earnedCents ?? 0) - (totals?.spentCents ?? 0),
      avgMonthlyBurnCents: totals?.spendMonths
        ? Math.round(totals.spentCents / totals.spendMonths)
        : 0,
      currency: totals?.currencies.length === 1 ? totals.currencies[0] : null,
    },
    aiCostEstimateUsd,
  }
}

function currentYearMonth(): string {
  const now = new Date()
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`
}

/** Recomputes today's per-user profit (plan revenue vs. AI cost, both normalized to one reporting
 * currency via Frankfurter FX) from live Stripe pricing + recorded AI usage — the expensive path,
 * meant to run once a day (C-433/cron) rather than per page view. */
async function computeUserProfitabilitySnapshot() {
  const rows = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      plan: users.plan,
      billingInterval: users.billingInterval,
      subscriptionStatus: users.subscriptionStatus,
    })
    .from(users)

  const planIntervalPairs = new Set<string>()
  for (const row of rows) {
    if (row.plan !== 'free' && row.billingInterval) {
      planIntervalPairs.add(`${row.plan}:${row.billingInterval}`)
    }
  }
  const priceByPlanInterval = new Map<string, { cents: number; currency: string } | null>()
  await Promise.all(
    Array.from(planIntervalPairs).map(async (key) => {
      const [plan, interval] = key.split(':') as ["mana" | "aether", BillingInterval]
      priceByPlanInterval.set(key, await getPlanMonthlyPriceCents(plan, interval))
    }),
  )

  const yearMonth = currentYearMonth()
  const usageRows = await db
    .select({
      userId: aiActionUsage.userId,
      inputTokens: sql<number>`coalesce(sum(${aiActionUsage.inputTokens}), 0)::int`,
      outputTokens: sql<number>`coalesce(sum(${aiActionUsage.outputTokens}), 0)::int`,
    })
    .from(aiActionUsage)
    .where(eq(aiActionUsage.yearMonth, yearMonth))
    .groupBy(aiActionUsage.userId)

  const aiCostByUser = new Map<string, number>()
  for (const row of usageRows) {
    const cost = estimateAiCostUsd(row.inputTokens, row.outputTokens)
    aiCostByUser.set(row.userId, (aiCostByUser.get(row.userId) ?? 0) + cost)
  }

  const reportingCurrency = Array.from(priceByPlanInterval.values()).find((p) => p !== null)?.currency ?? 'usd'
  const revenueCurrencies = new Set<string>()
  for (const price of priceByPlanInterval.values()) {
    if (price) revenueCurrencies.add(price.currency)
  }
  const date = todayCalendarDate()
  const { convert } = await buildConverterForBase(reportingCurrency, [
    ...Array.from(revenueCurrencies).map((currency) => ({ currency, date })),
    { currency: 'USD', date },
  ])

  const snapshotRows = rows.map((row) => {
    const entitled =
      row.plan !== 'free' &&
      row.billingInterval !== null &&
      row.subscriptionStatus !== null &&
      isEntitledSubscriptionStatus(row.subscriptionStatus as Stripe.Subscription.Status)

    const priceKey = row.billingInterval ? `${row.plan}:${row.billingInterval}` : null
    const price = entitled && priceKey ? priceByPlanInterval.get(priceKey) ?? null : null

    const estimatedMonthlyRevenueCents = price?.cents ?? 0
    const currency = price?.currency ?? null
    const aiCostUsd = aiCostByUser.get(row.id) ?? 0

    const revenueReportingCents = currency
      ? convert(estimatedMonthlyRevenueCents, currency, date) ?? estimatedMonthlyRevenueCents
      : 0
    const aiCostReportingCents = convert(Math.round(aiCostUsd * 100), 'USD', date) ?? Math.round(aiCostUsd * 100)

    return {
      snapshotDate: date,
      userId: row.id,
      name: row.name,
      email: row.email,
      plan: row.plan,
      billingInterval: row.billingInterval,
      subscriptionStatus: row.subscriptionStatus,
      estimatedMonthlyRevenueCents,
      currency,
      aiCostUsd,
      reportingCurrency,
      estimatedMonthlyRevenueReportingCents: revenueReportingCents,
      aiCostReportingCents,
      estimatedProfitReportingCents: revenueReportingCents - aiCostReportingCents,
    }
  })

  return snapshotRows
}

/** Computes and persists today's snapshot (replacing any earlier run for today) — called by the nightly cron and, lazily, the first time the report is viewed on a day with no snapshot yet. Upserts rather than delete+insert since the cron and the lazy trigger can race on the same day. */
export async function storeUserProfitabilitySnapshot(): Promise<number> {
  const rows = await computeUserProfitabilitySnapshot()
  if (rows.length > 0) {
    await db
      .insert(userProfitabilitySnapshots)
      .values(rows)
      .onConflictDoUpdate({
        target: [userProfitabilitySnapshots.snapshotDate, userProfitabilitySnapshots.userId],
        set: {
          name: sql`excluded.name`,
          email: sql`excluded.email`,
          plan: sql`excluded.plan`,
          billingInterval: sql`excluded.billing_interval`,
          subscriptionStatus: sql`excluded.subscription_status`,
          estimatedMonthlyRevenueCents: sql`excluded.estimated_monthly_revenue_cents`,
          currency: sql`excluded.currency`,
          aiCostUsd: sql`excluded.ai_cost_usd`,
          reportingCurrency: sql`excluded.reporting_currency`,
          estimatedMonthlyRevenueReportingCents: sql`excluded.estimated_monthly_revenue_reporting_cents`,
          aiCostReportingCents: sql`excluded.ai_cost_reporting_cents`,
          estimatedProfitReportingCents: sql`excluded.estimated_profit_reporting_cents`,
          updatedAt: new Date(),
        },
      })
  }
  return rows.length
}

const SORT_COLUMN = {
  revenue: userProfitabilitySnapshots.estimatedMonthlyRevenueReportingCents,
  cost: userProfitabilitySnapshots.aiCostReportingCents,
  profit: userProfitabilitySnapshots.estimatedProfitReportingCents,
} as const

/** Reads the latest per-user profit snapshot, paginated and sorted in SQL (C-433 internal Financial Report). */
export async function getUserProfitability(
  page = 1,
  pageSize = 50,
  sort: ProfitabilitySort = 'profit',
  dir: 'asc' | 'desc' = 'asc',
) {
  let [latest] = await db
    .select({ snapshotDate: userProfitabilitySnapshots.snapshotDate })
    .from(userProfitabilitySnapshots)
    .orderBy(desc(userProfitabilitySnapshots.snapshotDate))
    .limit(1)

  if (!latest) {
    await storeUserProfitabilitySnapshot()
    latest = { snapshotDate: todayCalendarDate() }
  }

  const where = eq(userProfitabilitySnapshots.snapshotDate, latest.snapshotDate)
  const orderFn = dir === 'asc' ? asc : desc

  const [rows, [totals]] = await Promise.all([
    db
      .select()
      .from(userProfitabilitySnapshots)
      .where(where)
      .orderBy(orderFn(SORT_COLUMN[sort]))
      .limit(pageSize)
      .offset((Math.max(1, page) - 1) * pageSize),
    db
      .select({
        totalCount: sql<number>`count(*)::int`,
        estimatedMonthlyRevenueCents: sql<number>`coalesce(sum(${userProfitabilitySnapshots.estimatedMonthlyRevenueReportingCents}), 0)::int`,
        aiCostUsd: sql<number>`coalesce(sum(${userProfitabilitySnapshots.aiCostReportingCents}), 0)::int`,
        estimatedProfit: sql<number>`coalesce(sum(${userProfitabilitySnapshots.estimatedProfitReportingCents}), 0)::int`,
      })
      .from(userProfitabilitySnapshots)
      .where(where),
  ])

  const reportingCurrency = rows[0]?.reportingCurrency ?? 'usd'

  return {
    generatedAt: new Date().toISOString(),
    snapshotDate: latest.snapshotDate,
    reportingCurrency,
    page,
    pageSize,
    totalCount: totals?.totalCount ?? 0,
    users: rows.map((row) => ({
      userId: row.userId,
      name: row.name,
      email: row.email,
      plan: row.plan,
      billingInterval: row.billingInterval,
      subscriptionStatus: row.subscriptionStatus,
      estimatedMonthlyRevenueCents: row.estimatedMonthlyRevenueCents,
      currency: row.currency,
      aiCostUsd: row.aiCostUsd,
      estimatedProfit: row.estimatedProfitReportingCents / 100,
    })),
    totals: {
      estimatedMonthlyRevenueCents: totals?.estimatedMonthlyRevenueCents ?? 0,
      aiCostUsd: (totals?.aiCostUsd ?? 0) / 100,
      estimatedProfit: (totals?.estimatedProfit ?? 0) / 100,
    },
  }
}

/** Daily revenue-vs-AI-cost trend from stored snapshots, both already normalized to that day's reporting currency (C-433 Financial Report trend panel). */
export async function getProfitTrend(limit = 60) {
  const rows = await db
    .select({
      snapshotDate: userProfitabilitySnapshots.snapshotDate,
      revenueReportingCents: sql<number>`coalesce(sum(${userProfitabilitySnapshots.estimatedMonthlyRevenueReportingCents}), 0)::int`,
      costReportingCents: sql<number>`coalesce(sum(${userProfitabilitySnapshots.aiCostReportingCents}), 0)::int`,
    })
    .from(userProfitabilitySnapshots)
    .groupBy(userProfitabilitySnapshots.snapshotDate)
    .orderBy(desc(userProfitabilitySnapshots.snapshotDate))
    .limit(limit)

  return { periods: rows }
}
