import { db } from '@api/db'
import { notifications, type NotificationEvent } from '@mana/db'
import { sendWebPush } from '@api/modules/push/service'
import { getNotificationPreferences, notificationPreferenceEnabled } from '@api/modules/notifications/preferences'

export async function createNotification({
  userId,
  title,
  body,
  key,
  params,
  link,
  event,
}: {
  userId: string
  // English fallback shown when the web has no translation for `key`
  title: string
  body: string
  key: string
  params?: Record<string, string | number>
  link?: string
  event?: NotificationEvent
}) {
  const preferences = event ? await getNotificationPreferences(userId) : undefined
  if (!event || (preferences && notificationPreferenceEnabled(preferences, event, 'inApp'))) {
    await db.insert(notifications).values({
      userId,
      title,
      body,
      key,
      params: params ?? null,
      link: link ?? null,
    })
  }

  try {
    await sendWebPush(userId, { title, body, link }, event)
  } catch (error) {
    console.error('[push] sendWebPush failed', error)
  }
}
