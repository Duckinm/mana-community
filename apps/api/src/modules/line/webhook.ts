import { and, eq, gt, inArray, isNotNull } from 'drizzle-orm'
import { db } from '@api/db'
import { lineConnections } from '@mana/db'
import { replyLineTextMessage } from '@api/lib/line/client'
import { extractCandidateCodes } from '@api/lib/line/link-code'

const HOW_TO_CONNECT =
  'Welcome to MANA. To connect LINE notifications, open Settings → Integrations → LINE, tap Connect, then send me the code shown there.'

type LineWebhookEvent = {
  type: string
  message?: { type: string; text?: string }
  source?: { userId?: string }
  replyToken?: string
}

/** Links a pending connection when the user sends their link code as a message to the OA. Always non-throwing — LINE requires a fast 200 ack regardless of outcome. */
export async function handleLineWebhookEvents(rawBody: string): Promise<void> {
  let payload: { events?: LineWebhookEvent[] }
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return
  }

  for (const event of payload.events ?? []) {
    if (event.type === 'follow') {
      if (event.replyToken) await replyLineTextMessage(event.replyToken, HOW_TO_CONNECT)
      continue
    }
    if (event.type !== 'message' || event.message?.type !== 'text') continue
    const lineUserId = event.source?.userId
    if (!lineUserId) continue

    const candidates = extractCandidateCodes(event.message.text ?? '')
    const [connection] = candidates.length
      ? await db
          .select()
          .from(lineConnections)
          .where(and(inArray(lineConnections.linkCode, candidates), isNotNull(lineConnections.linkCodeExpiresAt), gt(lineConnections.linkCodeExpiresAt, new Date())))
      : []

    if (!connection) {
      if (event.replyToken) await replyLineTextMessage(event.replyToken, HOW_TO_CONNECT)
      continue
    }

    await db
      .update(lineConnections)
      .set({ lineUserId, displayName: null, linkCode: null, linkCodeExpiresAt: null, updatedAt: new Date() })
      .where(eq(lineConnections.id, connection.id))

    if (event.replyToken) {
      await replyLineTextMessage(event.replyToken, 'Your LINE account is connected to MANA. You will receive notifications here.')
    }
  }
}
