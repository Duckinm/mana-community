import { AppError } from '@api/lib/errors'
import { ErrorResponse } from '@api/lib/wire-schema'
import Elysia, { t } from 'elysia'
import { betterAuthPlugin } from '@api/lib/auth-plugin'
import { verifyLineSignature, isLineConfigured } from '@api/lib/line/client'
import { getLineConnection, startLineConnection, disconnectLine } from '@api/modules/line/service'
import { handleLineWebhookEvents } from '@api/modules/line/webhook'
import { LineConnectionResponse } from '@api/modules/line/responses'

export const lineModule = new Elysia({ name: 'line', prefix: '/api/line' })
  .use(betterAuthPlugin)

  .get('/connection', async ({ user }) => {
    return getLineConnection(user.id)
  }, {
    auth: true,
    response: { 200: LineConnectionResponse },
    detail: { tags: ['LINE'], summary: 'Get LINE connection status' },
  })

  .post('/connect', async ({ user, status }) => {
    try {
      return await startLineConnection(user.id)
    } catch (error) {
      if (error instanceof AppError && error.statusCode === 503) return status(503, { error: error.message })
      throw error
    }
  }, {
    auth: true,
    response: { 200: LineConnectionResponse, 503: ErrorResponse },
    detail: { tags: ['LINE'], summary: 'Start LINE connection — generates a link code to send to the OA' },
  })

  .delete('/connection', async ({ user }) => {
    await disconnectLine(user.id)
    return getLineConnection(user.id)
  }, {
    auth: true,
    response: { 200: LineConnectionResponse },
    detail: { tags: ['LINE'], summary: 'Disconnect LINE' },
  })

  .post('/webhook', async ({ body, request, status }) => {
    if (!isLineConfigured()) return status(501, { error: 'LINE is not configured' })
    const signature = request.headers.get('x-line-signature')
    if (!signature || !verifyLineSignature(body, signature)) return status(400, { error: 'Invalid webhook signature' })

    await handleLineWebhookEvents(body)
    return { received: true }
  }, {
    parse: 'text',
    body: t.String(),
    detail: { tags: ['LINE'], summary: 'Receive verified LINE Messaging API webhook events' },
  })
