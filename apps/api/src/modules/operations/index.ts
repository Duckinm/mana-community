import Elysia from 'elysia'
import { max } from 'drizzle-orm'
import { sessions } from '@mana/db'
import { db } from '@api/db'
import { betterAuthPlugin } from '@api/lib/auth-plugin'
import { OperationsOverviewResponse, UsersActivityResponse } from '@api/modules/operations/responses'
import { getOperationsOverview } from '@api/modules/operations/service'

export const operationsModule = new Elysia({ name: 'operations', prefix: '/api/operations' })
  .use(betterAuthPlugin)
  .get('/overview', getOperationsOverview, {
    admin: true,
    response: { 200: OperationsOverviewResponse },
    detail: { tags: ['Operations'], summary: 'Get third-party operational status and statistics' },
  })
  .get('/users-activity', async () => {
    const rows = await db
      .select({ userId: sessions.userId, lastActiveAt: max(sessions.updatedAt) })
      .from(sessions)
      .groupBy(sessions.userId)
    return { users: rows.map((r) => ({ userId: r.userId, lastActiveAt: r.lastActiveAt?.toISOString() ?? null })) }
  }, {
    admin: true,
    response: { 200: UsersActivityResponse },
    detail: { tags: ['Operations'], summary: 'Get last session activity per user' },
  })
