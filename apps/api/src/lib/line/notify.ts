import { and, eq, isNotNull } from 'drizzle-orm'
import { db } from '@api/db'
import { lineConnections, lineLogs, type NotificationEvent } from '@mana/db'
import { pushLineFlexMessage } from '@api/lib/line/client'
import { getNotificationPreferences, notificationPreferenceEnabled } from '@api/modules/notifications/preferences'

/** Shared by document-activity and recurring-reminder notification sites — never throws, so LINE delivery can't break the email/bell path it piggybacks on. */
export async function sendLineNotification(input: { userId: string; referenceId: string; type: string; title: string; status: string; url: string; event: NotificationEvent }) {
  try {
    const preferences = await getNotificationPreferences(input.userId)
    if (!preferences || !notificationPreferenceEnabled(preferences, input.event, 'line')) return

    const [connection] = await db
      .select()
      .from(lineConnections)
      .where(and(eq(lineConnections.userId, input.userId), isNotNull(lineConnections.lineUserId)))
    if (!connection?.lineUserId) return

    const [existing] = await db.select({ id: lineLogs.id }).from(lineLogs).where(eq(lineLogs.referenceId, input.referenceId))
    if (existing) return

    const result = await pushLineFlexMessage(connection.lineUserId, { title: input.title, status: input.status, url: input.url })
    if (!result.ok) console.error('[line] push failed', result.message)
    await db.insert(lineLogs).values({
      userId: input.userId,
      lineUserId: connection.lineUserId,
      type: input.type,
      referenceId: input.referenceId,
      status: result.ok ? 'sent' : 'failed',
    })
  } catch {
    // swallow — LINE delivery is best-effort, never blocks the caller
  }
}
