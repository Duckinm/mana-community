import { t } from 'elysia'

const CurrencyBreakdown = t.Object({
  currency: t.String(),
  revenue: t.Number(),
  expenses: t.Number(),
  net: t.Number(),
})

const MonthBreakdown = t.Object({
  month: t.String(),
  revenue: t.Number(),
  expenses: t.Number(),
})

const CategoryBreakdown = t.Object({
  category: t.String(),
  amount: t.Number(),
  type: t.String(),
})

export const AccountingSummaryResponse = t.Object({
  revenue: t.Number(),
  expenses: t.Number(),
  net: t.Number(),
  taxEstimate: t.Number(),
  baseCurrency: t.String(),
  conversionIncomplete: t.Boolean(),
  byCurrency: t.Array(CurrencyBreakdown),
  byMonth: t.Array(MonthBreakdown),
  byCategory: t.Array(CategoryBreakdown),
})

const RecurringTransactionRow = t.Object({
  id: t.String(),
  description: t.String(),
  amountCents: t.Number(),
  recurringInterval: t.Union([t.String(), t.Null()]),
  category: t.String(),
  currency: t.String(),
})

export const RecurringTransactionsResponse = t.Object({
  recurringRevenue: t.Array(RecurringTransactionRow),
  recurringExpenses: t.Array(RecurringTransactionRow),
  mrr: t.Number(),
  baseCurrency: t.String(),
  conversionIncomplete: t.Boolean(),
})

const MonthlyIncomePoint = t.Object({
  month: t.String(),
  amount: t.Number(),
})

const CategoryAmount = t.Object({
  category: t.String(),
  amount: t.Number(),
})

const BudgetVsActualRow = t.Object({
  category: t.String(),
  budget: t.Number(),
  actual: t.Number(),
})

const BudgetUtilCategory = t.Object({
  category: t.String(),
  percent: t.Number(),
})

const BudgetUtilMonth = t.Object({
  month: t.String(),
  categories: t.Array(BudgetUtilCategory),
})

export const ChartDataResponse = t.Object({
  monthlyIncome: t.Array(MonthlyIncomePoint),
  expensesByCategory: t.Array(CategoryAmount),
  budgetVsActual: t.Array(BudgetVsActualRow),
  budgetUtilizationTrend: t.Array(BudgetUtilMonth),
  baseCurrency: t.String(),
  conversionIncomplete: t.Boolean(),
})

export const CashFlowForecastResponse = t.Object({
  mrr: t.Number(),
  avgMonthlyExpenses: t.Number(),
  projectedNet: t.Number(),
  forecastMonth: t.String(),
  baseCurrency: t.String(),
  conversionIncomplete: t.Boolean(),
  hasExpenseHistory: t.Boolean(),
})
