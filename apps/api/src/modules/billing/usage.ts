import { aiActionDaily, aiActionUsage, slipVerifyUsage } from '@mana/db'
import { and, asc, eq, gte, sql } from 'drizzle-orm'
import { db } from '@api/db'
import { env } from '@api/env'
import { countDocumentsSentThisMonth } from '@api/modules/documents/send-email'
import { getStorageQuota } from '@api/modules/storage/service'
import { countActiveProjects } from '@api/modules/billing/entitlements'

export type ActionBucket = 'ai'


function currentYearMonth(): string {
  const now = new Date()
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`
}

function todayUtcDate(): string {
  const now = new Date()
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-${String(now.getUTCDate()).padStart(2, '0')}`
}

export function nextResetAt(): Date {
  const now = new Date()
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1))
}

export async function claimAiAction(
  userId: string,
  bucket: ActionBucket = 'ai',
): Promise<void> {
  await db
    .insert(aiActionUsage)
    .values({ userId, yearMonth: currentYearMonth(), bucket, count: 1 })
    .onConflictDoUpdate({
      target: [aiActionUsage.userId, aiActionUsage.yearMonth, aiActionUsage.bucket],
      set: { count: sql`${aiActionUsage.count} + 1`, updatedAt: new Date() },
    })
}

const TOKEN_PRICES_USD = { input: 0.95, output: 4.0 }

export function estimateAiCostUsd(inputTokens: number, outputTokens: number): number {
  return (
    (inputTokens * TOKEN_PRICES_USD.input + outputTokens * TOKEN_PRICES_USD.output) /
    1_000_000
  )
}

export async function recordAiTokens(
  userId: string,
  usage: { input_tokens: number; output_tokens: number },
): Promise<void> {
  await Promise.all([
    db
      .insert(aiActionUsage)
      .values({
        userId,
        yearMonth: currentYearMonth(),
        bucket: 'ai',
        count: 0,
        inputTokens: usage.input_tokens,
        outputTokens: usage.output_tokens,
      })
      .onConflictDoUpdate({
        target: [aiActionUsage.userId, aiActionUsage.yearMonth, aiActionUsage.bucket],
        set: {
          inputTokens: sql`${aiActionUsage.inputTokens} + ${usage.input_tokens}`,
          outputTokens: sql`${aiActionUsage.outputTokens} + ${usage.output_tokens}`,
          updatedAt: new Date(),
        },
      }),
    db
      .insert(aiActionDaily)
      .values({
        userId,
        day: todayUtcDate(),
        count: 1,
        inputTokens: usage.input_tokens,
        outputTokens: usage.output_tokens,
      })
      .onConflictDoUpdate({
        target: [aiActionDaily.userId, aiActionDaily.day],
        set: {
          count: sql`${aiActionDaily.count} + 1`,
          inputTokens: sql`${aiActionDaily.inputTokens} + ${usage.input_tokens}`,
          outputTokens: sql`${aiActionDaily.outputTokens} + ${usage.output_tokens}`,
          updatedAt: new Date(),
        },
      }),
  ])
}

export async function getDailyAiUsage(userId: string, days = 365) {
  const since = new Date()
  since.setUTCDate(since.getUTCDate() - days)
  const sinceDay = `${since.getUTCFullYear()}-${String(since.getUTCMonth() + 1).padStart(2, '0')}-${String(since.getUTCDate()).padStart(2, '0')}`

  const rows = await db
    .select({
      day: aiActionDaily.day,
      count: aiActionDaily.count,
      inputTokens: aiActionDaily.inputTokens,
      outputTokens: aiActionDaily.outputTokens,
    })
    .from(aiActionDaily)
    .where(and(eq(aiActionDaily.userId, userId), gte(aiActionDaily.day, sinceDay)))
    .orderBy(asc(aiActionDaily.day))

  return { days: rows }
}

export async function getCurrentMonthUsage(userId: string) {
  const yearMonth = currentYearMonth()
  const [rows, slipVerifyRows, docsUsed, quota, projects] = await Promise.all([
    db
      .select({
        count: aiActionUsage.count,
        inputTokens: aiActionUsage.inputTokens,
        outputTokens: aiActionUsage.outputTokens,
        updatedAt: aiActionUsage.updatedAt,
      })
      .from(aiActionUsage)
      .where(
        and(
          eq(aiActionUsage.userId, userId),
          eq(aiActionUsage.yearMonth, yearMonth),
        ),
      ),
    db
      .select({ count: slipVerifyUsage.count })
      .from(slipVerifyUsage)
      .where(
        and(
          eq(slipVerifyUsage.userId, userId),
          eq(slipVerifyUsage.yearMonth, yearMonth),
        ),
      ),
    countDocumentsSentThisMonth(userId),
    getStorageQuota(userId),
    countActiveProjects(userId),
  ])

  let used = 0
  let inputTokens = 0
  let outputTokens = 0
  let lastUsedAt: Date | null = null
  for (const row of rows) {
    used += row.count
    inputTokens += row.inputTokens
    outputTokens += row.outputTokens
    if (!lastUsedAt || row.updatedAt > lastUsedAt) lastUsedAt = row.updatedAt
  }

  return {
    ai: {
      enabled: Boolean(env.ANTHROPIC_API_KEY),
      used,
      cap: null,
      inputTokens,
      outputTokens,
      costUsd: estimateAiCostUsd(inputTokens, outputTokens),
    },
    projects: { used: projects, cap: null },
    slipVerify: {
      used: slipVerifyRows[0]?.count ?? 0,
      cap: null,
    },
    docsSent: { used: docsUsed, cap: null },
    storage: { usedBytes: quota.usedBytes, capBytes: null },
    lastUsedAt: lastUsedAt ? lastUsedAt.toISOString() : null,
    resetAt: nextResetAt().toISOString(),
  }
}

export async function releaseAiAction(
  userId: string,
  bucket: ActionBucket,
): Promise<void> {
  await db
    .update(aiActionUsage)
    .set({
      count: sql`greatest(${aiActionUsage.count} - 1, 0)`,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(aiActionUsage.userId, userId),
        eq(aiActionUsage.yearMonth, currentYearMonth()),
        eq(aiActionUsage.bucket, bucket),
      ),
    )
}

export async function claimSlipVerification(userId: string): Promise<void> {
  await db
    .insert(slipVerifyUsage)
    .values({ userId, yearMonth: currentYearMonth(), count: 1 })
    .onConflictDoUpdate({
      target: [slipVerifyUsage.userId, slipVerifyUsage.yearMonth],
      set: { count: sql`${slipVerifyUsage.count} + 1`, updatedAt: new Date() },
    })
}

export async function releaseSlipVerification(userId: string): Promise<void> {
  await db
    .update(slipVerifyUsage)
    .set({
      count: sql`greatest(${slipVerifyUsage.count} - 1, 0)`,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(slipVerifyUsage.userId, userId),
        eq(slipVerifyUsage.yearMonth, currentYearMonth()),
      ),
    )
}
