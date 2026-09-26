import Elysia from 'elysia'
import { betterAuthPlugin } from '@api/lib/auth-plugin'
import {
  broadcastNotification,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '@api/modules/notifications/service'
import {
  BroadcastBody,
  BroadcastResponse,
  NotFoundResponse,
  NotificationResponse,
  NotificationsListResponse,
  ReadAllResponse,
} from '@api/modules/notifications/model'

export const notificationsModule = new Elysia({ name: 'notifications', prefix: '/api/notifications' })
  .use(betterAuthPlugin)

  .get('/', async ({ user }) => {
    return listNotifications(user.id)
  }, {
    auth: true,
    response: { 200: NotificationsListResponse },
    detail: { tags: ['Notifications'], summary: 'List notifications with unread count' },
  })

  .patch('/:id/read', async ({ user, status, params }) => {
    const updated = await markNotificationRead(user.id, params.id)
    if (!updated) return status(404, { message: 'Not found' })
    return updated
  }, {
    auth: true,
    response: { 200: NotificationResponse, 404: NotFoundResponse },
    detail: { tags: ['Notifications'], summary: 'Mark notification read' },
  })

  .post('/broadcast', async ({ body }) => broadcastNotification(body), {
    admin: true,
    body: BroadcastBody,
    response: { 200: BroadcastResponse },
    detail: { tags: ['Notifications'], summary: 'Broadcast a notification to selected users' },
  })

  .post('/read-all', async ({ user }) => {
    return markAllNotificationsRead(user.id)
  }, {
    auth: true,
    response: { 200: ReadAllResponse },
    detail: { tags: ['Notifications'], summary: 'Mark all notifications read' },
  })
