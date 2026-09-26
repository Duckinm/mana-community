import webpush from 'web-push'
import { db } from '@api/db'
import { env } from '@api/env'
import { pushSubscriptions, users, type NotificationEvent } from '@mana/db'
import { and, eq } from 'drizzle-orm'
import { notificationPreferenceEnabled } from '@api/modules/notifications/preferences'

if (env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY && env.VAPID_SUBJECT) {
  webpush.setVapidDetails(env.VAPID_SUBJECT, env.VAPID_PUBLIC_KEY, env.VAPID_PRIVATE_KEY)
}

export async function savePushSubscription(
  userId: string,
  { endpoint, keys, userAgent }: { endpoint: string; keys: { p256dh: string; auth: string }; userAgent?: string },
) {
  await db
    .insert(pushSubscriptions)
    .values({ userId, endpoint, p256dh: keys.p256dh, auth: keys.auth, userAgent })
    .onConflictDoUpdate({
      target: [pushSubscriptions.userId, pushSubscriptions.endpoint],
      set: { p256dh: keys.p256dh, auth: keys.auth, userAgent, updatedAt: new Date() },
    })
}

export async function removePushSubscription(userId: string, endpoint: string) {
  await db
    .delete(pushSubscriptions)
    .where(and(eq(pushSubscriptions.userId, userId), eq(pushSubscriptions.endpoint, endpoint)))
}

export async function sendWebPush(
  userId: string,
  payload: { title: string; body: string; link?: string | null },
  event?: NotificationEvent,
) {
  if (!env.VAPID_PUBLIC_KEY || !env.VAPID_PRIVATE_KEY) return

  const [user] = await db
    .select({
      notifDesktopPush: users.notifDesktopPush,
      notificationPreferences: users.notificationPreferences,
    })
    .from(users)
    .where(eq(users.id, userId))
  if (!user?.notifDesktopPush) return
  if (event && !notificationPreferenceEnabled(user.notificationPreferences, event, 'push')) return

  const subscriptions = await db.select().from(pushSubscriptions).where(eq(pushSubscriptions.userId, userId))
  if (subscriptions.length === 0) return

  await Promise.all(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify(payload),
        )
      } catch (error) {
        const statusCode = (error as { statusCode?: number }).statusCode
        if (statusCode === 404 || statusCode === 410) {
          await removePushSubscription(userId, sub.endpoint)
        } else {
          console.error('[push] send failed', sub.endpoint, error)
        }
      }
    }),
  )
}
