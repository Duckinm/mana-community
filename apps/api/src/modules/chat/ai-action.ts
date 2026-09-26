import { db } from '@api/db'
import { chatMessages, chatSessions } from '@mana/db'
import { eq, sql } from 'drizzle-orm'
import { releaseAiAction, type ActionBucket } from '@api/modules/billing/usage'

export interface AiActionSettleParams {
  userId: string
  sessionId: string
  userMessage: string
  assistantText: string
  toolCalls: { name: string; result: unknown }[]
  aborted: boolean
  actionBucket: ActionBucket
  usedBonusCredit: boolean
}

/**
 * Persists one completed AI Action turn after its quota slot has been reserved.
 * An aborted or failed turn releases that reservation so it does not consume quota.
 */
export async function settleAiAction(params: AiActionSettleParams): Promise<void> {
  const { userId, sessionId, userMessage, assistantText, toolCalls, aborted, actionBucket, usedBonusCredit } = params
  const completed = !aborted && Boolean(assistantText || toolCalls.length > 0)

  try {
    await db.insert(chatMessages).values({ userId, sessionId, role: 'user', content: userMessage })

    if (completed) {
      await db.insert(chatMessages).values({
        userId,
        sessionId,
        role: 'assistant',
        content: assistantText || '(tool calls only)',
        toolCalls: toolCalls.length > 0 ? JSON.stringify(toolCalls.map((t) => t.name)) : null,
        toolResults: toolCalls.length > 0 ? JSON.stringify(toolCalls) : null,
      })
    }

    await db
      .update(chatSessions)
      .set({ updatedAt: sql`NOW()` })
      .where(eq(chatSessions.id, sessionId))
  } finally {
    if (!completed) await releaseAiAction(userId, actionBucket, usedBonusCredit)
  }
}
