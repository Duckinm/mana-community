import Elysia from 'elysia'
import { betterAuthPlugin } from '@api/lib/auth-plugin'
import { removePushSubscription, savePushSubscription } from '@api/modules/push/service'
import { PushSubscribeBody, PushUnsubscribeBody } from '@api/modules/push/model'

export const pushModule = new Elysia({ name: 'push', prefix: '/api/push' })
  .use(betterAuthPlugin)

  // route named "register", not "subscribe" — Eden Treaty reserves the literal
  // key `subscribe` on client calls for opening a WebSocket connection
  .post('/register', async ({ user, body, headers }) => {
    await savePushSubscription(user.id, { ...body, userAgent: headers['user-agent'] })
    return { ok: true }
  }, {
    auth: true,
    body: PushSubscribeBody,
    detail: { tags: ['Push'], summary: 'Register a browser push subscription' },
  })

  .post('/unsubscribe', async ({ user, body }) => {
    await removePushSubscription(user.id, body.endpoint)
    return { ok: true }
  }, {
    auth: true,
    body: PushUnsubscribeBody,
    detail: { tags: ['Push'], summary: 'Remove a browser push subscription' },
  })
