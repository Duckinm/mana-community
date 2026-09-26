import Elysia from 'elysia'
import { betterAuthPlugin } from '@api/lib/auth-plugin'
import { sendReminders } from '@api/modules/reminders/service'
import { SendRemindersBody } from '@api/modules/reminders/model'
import { SendRemindersResponse } from '@api/modules/reminders/responses'

export const remindersModule = new Elysia({ name: 'reminders', prefix: '/api/reminders' })
  .use(betterAuthPlugin)

  .post('/send', async ({ user, body }) => {
    const results = await sendReminders(user.id, body.documentIds)
    return { results }
  }, {
    auth: true,
    body: SendRemindersBody,
    response: { 200: SendRemindersResponse },
    detail: { tags: ['Reminders'], summary: 'Send invoice reminder emails' },
  })
