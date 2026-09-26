import Elysia from 'elysia'
import { sql } from 'drizzle-orm'
import { db } from '@api/db'
import { env } from '@api/env'
import { HealthResponse, DegradedHealthResponse } from '@api/modules/health/responses'

const startTime = Date.now()

async function isDbReachable(): Promise<boolean> {
  try {
    await Promise.race([
      db.execute(sql`select 1`),
      new Promise((_, reject) => setTimeout(() => reject(new Error('db ping timeout')), 2000)),
    ])
    return true
  } catch {
    return false
  }
}

export const healthModule = new Elysia()
  .get('/health', async ({ status }) => {
    if (!(await isDbReachable())) return status(503, { status: 'degraded' as const })
    return {
      status: 'ok' as const,
      uptime: Math.floor((Date.now() - startTime) / 1000),
      timestamp: new Date().toISOString(),
      aiProvider: env.ANTHROPIC_BASE_URL ? new URL(env.ANTHROPIC_BASE_URL).hostname : 'api.anthropic.com',
      aiModel: env.AI_MODEL,
    }
  }, {
    response: { 200: HealthResponse, 503: DegradedHealthResponse },
    detail: { tags: ['Health'], summary: 'Health check' },
  })
