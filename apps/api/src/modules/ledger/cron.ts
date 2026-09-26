import Elysia from 'elysia'
import { cron } from '@elysiajs/cron'
import { env } from '@api/env'
import { registerCron } from '@api/lib/cron-monitor'
import { requireCronSecret } from '@api/lib/cron-secret'
import { storeUserProfitabilitySnapshot } from '@api/modules/ledger/service'

export const ledgerCronModule = new Elysia({ prefix: '/api/cron' })
  .use(
    cron({
      ...registerCron('ledger-daily-profitability-snapshot', '0 2 * * *', storeUserProfitabilitySnapshot),
    }),
  )
  .post('/ledger-snapshot', async ({ request, status }) => {
    const unauthorized = requireCronSecret(request, status, env.CRON_SECRET)
    if (unauthorized) return unauthorized

    const count = await storeUserProfitabilitySnapshot()
    return { count }
  }, {
    detail: { tags: ['Ledger'], summary: 'Recompute today\'s per-user profitability snapshot' },
  })
