import { afterEach, describe, expect, it } from 'bun:test'
import { eq } from 'drizzle-orm'
import { db } from '@api/db'
import { users } from '@mana/db'
import { financeHandlers, financeTools } from '@api/utils/mcp-tools/finance'

const createdUserIds: string[] = []

afterEach(async () => {
  for (const userId of createdUserIds.splice(0)) {
    await db.delete(users).where(eq(users.id, userId))
  }
})

describe('get_cash_flow_forecast MCP tool', () => {
  it('uses the service-backed next-month forecast with its fixed bounded history window', async () => {
    const [user] = await db
      .insert(users)
      .values({ name: 'Forecast MCP User', email: `mcp-forecast-${crypto.randomUUID()}@example.com`, currency: 'THB' })
      .returning()
    createdUserIds.push(user.id)

    const tool = financeTools.find((candidate) => candidate.name === 'get_cash_flow_forecast')
    expect(tool).toMatchObject({
      input_schema: { type: 'object', properties: {}, required: [] },
    })
    expect(tool?.description).toContain('three complete calendar months')

    const result = await financeHandlers['get_cash_flow_forecast'](user.id, {}) as {
      mrr: number
      avgMonthlyExpenses: number
      projectedNet: number
      forecastMonth: string
      baseCurrency: string
      hasExpenseHistory: boolean
    }

    expect(result).toMatchObject({
      mrr: 0,
      avgMonthlyExpenses: 0,
      projectedNet: 0,
      baseCurrency: 'THB',
      hasExpenseHistory: false,
    })
    expect(result.forecastMonth).toMatch(/^\d{4}-\d{2}$/)
  })
})
