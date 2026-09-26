import { t } from 'elysia'
import { NotificationResponse, NotificationsListResponse } from '@api/lib/db-schema'
import { NotFoundResponse } from '@api/lib/wire-schema'

export { NotificationResponse, NotificationsListResponse, NotFoundResponse }

export const ReadAllResponse = t.Object({
  updated: t.Number(),
})

export const BroadcastBody = t.Object({
  userIds: t.Union([t.Literal('all'), t.Array(t.String(), { minItems: 1 })]),
  title: t.String({ minLength: 1, maxLength: 120 }),
  body: t.String({ minLength: 1, maxLength: 1000 }),
  link: t.Optional(t.String({ maxLength: 500 })),
})

export const BroadcastResponse = t.Object({
  sent: t.Number(),
})
