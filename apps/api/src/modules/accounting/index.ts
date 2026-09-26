import Elysia, { t } from 'elysia'
import { betterAuthPlugin } from '@api/lib/auth-plugin'
import { getAccountingSummary, getRecurringTransactions, getChartData, getCashFlowForecast } from '@api/modules/accounting/service'

import {
  AccountingSummaryResponse,
  RecurringTransactionsResponse,
  ChartDataResponse,
  CashFlowForecastResponse,
} from '@api/modules/accounting/responses'

export const accountingModule = new Elysia({ name: 'accounting', prefix: '/api/accounting' })
  .use(betterAuthPlugin)

  .get('/summary', async ({ user, query }) => {
    return getAccountingSummary(user.id, query.period ?? 'month')
  }, {
    auth: true,
    query: t.Object({ period: t.Optional(t.String()) }),
    response: { 200: AccountingSummaryResponse },
    detail: { tags: ['Accounting'], summary: 'Get accounting summary for a period' },
  })

  .get('/recurring', async ({ user }) => {
    return getRecurringTransactions(user.id)
  }, {
    auth: true,
    response: { 200: RecurringTransactionsResponse },
    detail: { tags: ['Accounting'], summary: 'Get recurring transactions and MRR' },
  })

  .get('/chart-data', async ({ user }) => {
    return getChartData(user.id)
  }, {
    auth: true,
    response: { 200: ChartDataResponse },
    detail: { tags: ['Accounting'], summary: 'Get chart data: monthly income, expenses by category, budget vs actual, budget utilization trend' },
  })

  .get('/forecast', async ({ user }) => {
    return getCashFlowForecast(user.id)
  }, {
    auth: true,
    response: { 200: CashFlowForecastResponse },
    detail: { tags: ['Accounting'], summary: 'Get cash flow forecast for next month' },
  })
