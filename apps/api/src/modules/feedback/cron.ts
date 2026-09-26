import Elysia from 'elysia'
import { cron } from '@elysiajs/cron'
import { env } from '@api/env'
import { registerCron } from '@api/lib/cron-monitor'
import { requireCronSecret } from '@api/lib/cron-secret'
import { prioritizeAllFeedback } from '@api/modules/feedback/prioritize'

export const feedbackCronModule = new Elysia({ prefix: '/api/cron' })
  .use(
    cron({
      ...registerCron('feedback-daily-review', '0 3 * * *', prioritizeAllFeedback),
    }),
  )
  .post('/feedback-prioritize', async ({ request, status }) => {
    const unauthorized = requireCronSecret(request, status, env.CRON_SECRET)
    if (unauthorized) return unauthorized

    return prioritizeAllFeedback()
  }, {
    detail: { tags: ['Feedback'], summary: 'AI-prioritize open feedback for all users' },
  })
