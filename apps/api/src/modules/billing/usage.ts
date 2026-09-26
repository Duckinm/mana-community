import { aiActionDaily, aiActionUsage, slipVerifyUsage, users } from '@mana/db'
import {
  ACTION_CAPS,
  getCoreEntitlements,
  SLIP_VERIFY_CAPS,
  type PlanId,
} from '@mana/db/plan-entitlements'
import { and, asc, eq, gt, gte, lt, sql } from 'drizzle-orm'
import { db } from '@api/db'
import { env } from '@api/env'
import { countDocumentsSentThisMonth } from '@api/modules/documents/send-email'
import { getStorageQuota } from '@api/modules/storage/service'
import { getProjectEntitlement } from '@api/modules/billing/entitlements'

export type Plan = PlanId
export type ActionBucket = 'ai'

export { ACTION_CAPS }

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

export async function recordAiAction(
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

export async function getCurrentMonthUsage(userId: string, plan: Plan) {
  const yearMonth = currentYearMonth()
  const [rows, slipVerifyRows, docsUsed, quota, projects, userRows] = await Promise.all([
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
    getProjectEntitlement(userId, plan),
    db
      .select({ profileAiActionCredits: users.profileAiActionCredits })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1),
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

  const baseCap = ACTION_CAPS[plan]
  const bonusRemaining = userRows[0]?.profileAiActionCredits ?? 0
  const bonusUsed = Math.max(0, used - baseCap)

  return {
    ai: {
      enabled: Boolean(env.ANTHROPIC_API_KEY),
      used,
      cap: baseCap + bonusRemaining + bonusUsed,
      bonusRemaining,
      inputTokens,
      outputTokens,
      costUsd: estimateAiCostUsd(inputTokens, outputTokens),
    },
    projects,
    slipVerify: {
      used: slipVerifyRows[0]?.count ?? 0,
      cap: SLIP_VERIFY_CAPS[plan],
    },
    docsSent: { used: docsUsed, cap: getCoreEntitlements(plan, env.DEPLOYMENT_MODE).docsSent },
    storage: { usedBytes: quota.usedBytes, capBytes: getCoreEntitlements(plan, env.DEPLOYMENT_MODE).storageBytes },
    lastUsedAt: lastUsedAt ? lastUsedAt.toISOString() : null,
    resetAt: nextResetAt().toISOString(),
  }
}

export interface ActionCapResult {
  blocked: boolean
  bucket: ActionBucket
  used: number
  cap: number
  usedBonusCredit: boolean
}

interface ClaimAiActionOptions {
  enforceCap?: boolean
}

export async function claimAiAction(
  userId: string,
  plan: Plan,
  options: ClaimAiActionOptions = {},
): Promise<ActionCapResult> {
  const bucket: ActionBucket = 'ai'
  const cap = ACTION_CAPS[plan]
  const capDisabled =
    !options.enforceCap && env.AI_CAP_DISABLED === 'true' && env.NODE_ENV !== 'production'
  if (capDisabled) {
    await recordAiAction(userId, bucket)
    const usage = await getCurrentMonthUsage(userId, plan)
    return { blocked: false, bucket, used: usage.ai.used, cap: usage.ai.cap, usedBonusCredit: false }
  }

  const rows = await db
    .insert(aiActionUsage)
    .values({ userId, yearMonth: currentYearMonth(), bucket, count: 1 })
    .onConflictDoUpdate({
      target: [aiActionUsage.userId, aiActionUsage.yearMonth, aiActionUsage.bucket],
      set: { count: sql`${aiActionUsage.count} + 1`, updatedAt: new Date() },
      setWhere: lt(aiActionUsage.count, cap),
    })
    .returning({ count: aiActionUsage.count })

  if (rows[0]) return { blocked: false, bucket, used: rows[0].count, cap, usedBonusCredit: false }

  const [credit] = await db
    .update(users)
    .set({
      profileAiActionCredits: sql`${users.profileAiActionCredits} - 1`,
      updatedAt: new Date(),
    })
    .where(and(eq(users.id, userId), gt(users.profileAiActionCredits, 0)))
    .returning({ profileAiActionCredits: users.profileAiActionCredits })

  if (credit) {
    try {
      await recordAiAction(userId, bucket)
    } catch (error) {
      await db
        .update(users)
        .set({
          profileAiActionCredits: sql`${users.profileAiActionCredits} + 1`,
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId))
      throw error
    }
    const usage = await getCurrentMonthUsage(userId, plan)
    return { blocked: false, bucket, used: usage.ai.used, cap: usage.ai.cap, usedBonusCredit: true }
  }

  const usage = await getCurrentMonthUsage(userId, plan)
  return { blocked: true, bucket, used: usage.ai.used, cap: usage.ai.cap, usedBonusCredit: false }
}

export async function releaseAiAction(
  userId: string,
  bucket: ActionBucket,
  usedBonusCredit = false,
): Promise<void> {
  if (usedBonusCredit) {
    await db
      .update(users)
      .set({
        profileAiActionCredits: sql`${users.profileAiActionCredits} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
    return
  }

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

export interface SlipVerifyCapResult {
  blocked: boolean
  used: number
  cap: number | null
}

export async function claimSlipVerification(
  userId: string,
  plan: Plan,
): Promise<SlipVerifyCapResult> {
  const cap = SLIP_VERIFY_CAPS[plan]
  if (cap === 0) return { blocked: true, used: 0, cap }

  if (cap === null) {
    const rows = await db
      .insert(slipVerifyUsage)
      .values({ userId, yearMonth: currentYearMonth(), count: 1 })
      .onConflictDoUpdate({
        target: [slipVerifyUsage.userId, slipVerifyUsage.yearMonth],
        set: { count: sql`${slipVerifyUsage.count} + 1`, updatedAt: new Date() },
      })
      .returning({ count: slipVerifyUsage.count })
    return { blocked: false, used: rows[0]!.count, cap }
  }

  const rows = await db
    .insert(slipVerifyUsage)
    .values({ userId, yearMonth: currentYearMonth(), count: 1 })
    .onConflictDoUpdate({
      target: [slipVerifyUsage.userId, slipVerifyUsage.yearMonth],
      set: { count: sql`${slipVerifyUsage.count} + 1`, updatedAt: new Date() },
      setWhere: lt(slipVerifyUsage.count, cap),
    })
    .returning({ count: slipVerifyUsage.count })

  if (rows[0]) return { blocked: false, used: rows[0].count, cap }
  const [row] = await db
    .select()
    .from(slipVerifyUsage)
    .where(
      and(
        eq(slipVerifyUsage.userId, userId),
        eq(slipVerifyUsage.yearMonth, currentYearMonth()),
      ),
    )
  return { blocked: true, used: row?.count ?? cap, cap }
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
