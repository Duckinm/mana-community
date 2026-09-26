import Elysia from 'elysia'
import { cron } from '@elysiajs/cron'
import { env } from '@api/env'
import { registerCron } from '@api/lib/cron-monitor'
import { requireCronSecret } from '@api/lib/cron-secret'
import { sendCalendarReminders } from '@api/modules/calendar/reminders'
import { syncAllGoogleConnections } from '@api/modules/calendar/sync'

// Scheduled in-process (single always-on machine, like ledger/feedback) — GitHub Actions'
// scheduler silently stalled for 2h on 2026-08-01, so no external scheduler. The Sentry
// monitor alerts on missed ticks; the HTTP endpoints below remain for manual runs.
export const calendarCronModule = new Elysia({ prefix: '/api/cron' })
  .use(
    cron({
      ...registerCron('calendar-reminders', '*/10 * * * *', sendCalendarReminders),
    }),
  )
  .use(
    cron({
      ...registerCron('calendar-sync', '*/30 * * * *', syncAllGoogleConnections, {
        checkinMargin: 30,
        maxRuntime: 25,
      }),
    }),
  )
  .post('/calendar-reminders', async ({ request, status }) => {
    const unauthorized = requireCronSecret(request, status, env.CRON_SECRET)
    if (unauthorized) return unauthorized

    return sendCalendarReminders()
  }, {
    detail: { tags: ['Calendar'], summary: 'Send due calendar email reminders' },
  })

  .post('/calendar-sync', async ({ request, status }) => {
    const unauthorized = requireCronSecret(request, status, env.CRON_SECRET)
    if (unauthorized) return unauthorized

    return syncAllGoogleConnections()
  }, {
    detail: { tags: ['Calendar'], summary: 'Incremental Google Calendar sync for all connections' },
  })
