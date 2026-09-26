import { t } from 'elysia'

export const PushSubscribeBody = t.Object({
  endpoint: t.String(),
  keys: t.Object({
    p256dh: t.String(),
    auth: t.String(),
  }),
})

export const PushUnsubscribeBody = t.Object({
  endpoint: t.String(),
})
