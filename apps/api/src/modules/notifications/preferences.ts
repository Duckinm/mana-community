import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  users,
  type NotificationChannel,
  type NotificationEvent,
  type NotificationPreferences,
} from '@mana/db'
import { eq } from 'drizzle-orm'
import { db } from '@api/db'

export function notificationPreferenceEnabled(
  preferences: NotificationPreferences,
  event: NotificationEvent,
  channel: NotificationChannel,
) {
  const key = `${event}.${channel}` as const
  return preferences[key] ?? DEFAULT_NOTIFICATION_PREFERENCES[key] ?? false
}

export async function getNotificationPreferences(userId: string) {
  const [user] = await db
    .select({ notificationPreferences: users.notificationPreferences })
    .from(users)
    .where(eq(users.id, userId))
  return user?.notificationPreferences
}
