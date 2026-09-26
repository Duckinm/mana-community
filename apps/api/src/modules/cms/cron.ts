import Elysia from 'elysia'
import { cron } from '@elysiajs/cron'
import { env } from '@api/env'
import { registerCron } from '@api/lib/cron-monitor'
import { requireCronSecret } from '@api/lib/cron-secret'
import { triggerLandingRebuild } from '@api/lib/rebuild-landing'
import { MessageResponse } from '@api/lib/wire-schema'
import { PublishDueResponse } from '@api/modules/cms/model'
import { publishDueArticles } from '@api/modules/cms/service'

export type CmsCronDeps = {
  triggerRebuild?: () => Promise<void>
  now?: () => Date
  cronSecret?: string
}

export function createCmsCronModule({
  triggerRebuild = triggerLandingRebuild,
  now = () => new Date(),
  cronSecret = env.CRON_SECRET,
}: CmsCronDeps = {}) {
  return new Elysia({ prefix: '/api/cron' })
    .post('/publish-due', async ({ request, status }) => {
      const unauthorized = requireCronSecret(request, status, cronSecret)
      if (unauthorized) return unauthorized

      const published = await publishDueArticles(now())
      // one dispatch per tick: a batch of due articles must not queue N landing builds
      if (published > 0) await triggerRebuild()
      return { published }
    }, {
      response: { 200: PublishDueResponse, 401: MessageResponse },
      detail: { tags: ['CMS'], summary: 'Publish every scheduled article whose window has passed' },
    })
}

// Schedule lives on the production instance, not the factory, so test instances
// (createCmsCronModule with fake deps) never start timers. In-process for the same
// reason as calendar/cron.ts: GitHub Actions' scheduler stalls silently.
export const cmsCronModule = createCmsCronModule().use(
  cron({
    ...registerCron('publish-due', '*/10 * * * *', async () => {
      const published = await publishDueArticles(new Date())
      if (published > 0) await triggerLandingRebuild()
    }),
  }),
)
