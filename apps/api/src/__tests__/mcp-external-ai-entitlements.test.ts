import { afterAll, describe, expect, it } from 'bun:test'
import { aiActionUsage, users } from '@mana/db'
import { inArray } from 'drizzle-orm'
import { db } from '@api/db'
import { executeToolCall } from '@api/utils/mcp-tools'

const createdUserIds: string[] = []

function currentYearMonth() {
  const now = new Date()
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`
}

afterAll(async () => {
  if (createdUserIds.length === 0) return
  await db.delete(aiActionUsage).where(inArray(aiActionUsage.userId, createdUserIds))
  await db.delete(users).where(inArray(users.id, createdUserIds))
})

describe('external MCP AI entitlements', () => {
  it('blocks an external AI tool before it can call the provider once the plan cap is used', async () => {
    const [user] = await db
      .insert(users)
      .values({ name: 'MCP entitlement test', email: `mcp-entitlement-${crypto.randomUUID()}@example.com` })
      .returning()
    createdUserIds.push(user.id)

    await db.insert(aiActionUsage).values({
      userId: user.id,
      yearMonth: currentYearMonth(),
      bucket: 'ai',
      count: 25,
    })

    const result = await executeToolCall(
      user.id,
      'generate_tasks',
      { projectId: 'not-reached', brief: 'This must not reach the AI provider.' },
      { source: 'external-mcp' },
    )

    expect(result).toMatchObject({
      error: 'PLAN_LIMIT_AI_ACTIONS',
      plan: 'free',
      used: 25,
      cap: 25,
    })
  })
})
