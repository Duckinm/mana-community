import { db } from '@api/db'
import { notifications, users } from '@mana/db'
import { and, desc, eq, inArray, isNull } from 'drizzle-orm'
import { sendWebPush } from '@api/modules/push/service'

function notificationToWire(row: typeof notifications.$inferSelect) {
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    key: row.key,
    params: row.params,
    link: row.link,
    readAt: row.readAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  }
}

export async function listNotifications(userId: string) {
  const [rows, unread] = await Promise.all([
    db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt))
      .limit(30),
    db.$count(notifications, and(eq(notifications.userId, userId), isNull(notifications.readAt))),
  ])
  return { items: rows.map(notificationToWire), unread }
}

export async function markNotificationRead(userId: string, notificationId: string) {
  const [updated] = await db
    .update(notifications)
    .set({ readAt: new Date(), updatedAt: new Date() })
    .where(and(eq(notifications.id, notificationId), eq(notifications.userId, userId)))
    .returning()
  return updated ? notificationToWire(updated) : null
}

export async function broadcastNotification({
  userIds,
  title,
  body,
  link,
}: {
  userIds: string[] | 'all'
  title: string
  body: string
  link?: string
}) {
  const rows = await db
    .select({ id: users.id })
    .from(users)
    .where(userIds === 'all' ? eq(users.banned, false) : and(inArray(users.id, userIds), eq(users.banned, false)))
  if (rows.length === 0) return { sent: 0 }

  await db.insert(notifications).values(
    rows.map(({ id }) => ({ userId: id, title, body, link: link ?? null })),
  )

  // ponytail: fan-out in one shot; batch or queue if broadcasts ever exceed a few thousand users
  await Promise.allSettled(rows.map(({ id }) => sendWebPush(id, { title, body, link })))

  return { sent: rows.length }
}

export async function markAllNotificationsRead(userId: string) {
  const rows = await db
    .update(notifications)
    .set({ readAt: new Date(), updatedAt: new Date() })
    .where(and(eq(notifications.userId, userId), isNull(notifications.readAt)))
    .returning({ id: notifications.id })
  return { updated: rows.length }
}
