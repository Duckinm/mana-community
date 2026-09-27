import Elysia from 'elysia'
import { betterAuthPlugin } from '@api/lib/auth-plugin'
import { getCurrentMonthUsage, getDailyAiUsage } from '@api/modules/billing/usage'
import { DailyUsageResponse, UsageResponse } from '@api/modules/billing/responses'

export const billingModule = new Elysia({ name: 'usage', prefix: '/api/billing' })
  .use(betterAuthPlugin)
  .get('/usage', ({ user }) => getCurrentMonthUsage(user.id), {
    auth: true,
    response: { 200: UsageResponse },
    detail: { tags: ['Usage'], summary: 'Current-month resource usage; community has no subscription caps' },
  })
  .get('/usage/daily', ({ user }) => getDailyAiUsage(user.id), {
    auth: true,
    response: { 200: DailyUsageResponse },
    detail: { tags: ['Usage'], summary: 'Daily AI usage for the last 365 UTC days' },
  })
