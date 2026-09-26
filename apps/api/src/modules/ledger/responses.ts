import { t } from 'elysia'

export const LedgerEntry = t.Object({
  id: t.String(),
  source: t.String(),
  direction: t.String(),
  amountCents: t.Number(),
  currency: t.String(),
  date: t.String(),
  note: t.Union([t.String(), t.Null()]),
  stripeEventId: t.Union([t.String(), t.Null()]),
  createdAt: t.String(),
})

export const LedgerEntriesResponse = t.Object({
  entries: t.Array(LedgerEntry),
})

export const LedgerSummaryResponse = t.Object({
  granularity: t.Union([t.Literal('day'), t.Literal('week'), t.Literal('month')]),
  periods: t.Array(t.Object({
    period: t.String(),
    earnedCents: t.Number(),
    spentCents: t.Number(),
  })),
  totals: t.Object({
    earnedCents: t.Number(),
    spentCents: t.Number(),
    netCents: t.Number(),
    avgMonthlyBurnCents: t.Number(),
    currency: t.Union([t.String(), t.Null()]),
  }),
  aiCostEstimateUsd: t.Number(),
})

export const UserProfitabilityResponse = t.Object({
  generatedAt: t.String(),
  snapshotDate: t.String(),
  reportingCurrency: t.String(),
  page: t.Number(),
  pageSize: t.Number(),
  totalCount: t.Number(),
  users: t.Array(t.Object({
    userId: t.String(),
    name: t.String(),
    email: t.String(),
    plan: t.String(),
    billingInterval: t.Union([t.String(), t.Null()]),
    subscriptionStatus: t.Union([t.String(), t.Null()]),
    estimatedMonthlyRevenueCents: t.Number(),
    currency: t.Union([t.String(), t.Null()]),
    aiCostUsd: t.Number(),
    estimatedProfit: t.Number(),
  })),
  totals: t.Object({
    estimatedMonthlyRevenueCents: t.Number(),
    aiCostUsd: t.Number(),
    estimatedProfit: t.Number(),
  }),
})

export const ProfitTrendResponse = t.Object({
  periods: t.Array(t.Object({
    snapshotDate: t.String(),
    revenueReportingCents: t.Number(),
    costReportingCents: t.Number(),
  })),
})
