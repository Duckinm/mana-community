import Elysia, { t } from 'elysia'
import { env } from '@api/env'
import { clientIp, hitRateLimit } from '@api/lib/rate-limiter'
import { NoContentResponse } from '@api/lib/wire-schema'
import { type BlogEvent, recordBlogEvent, visitorHash } from '@api/modules/cms/events'
import { BlogFeedResponse } from '@api/modules/cms/model'
import { listPublishedArticles } from '@api/modules/cms/service'

export type BlogPublicDeps = {
  now?: () => Date
  ingestSecret?: string
}

function isBlogEvent(value: unknown): value is BlogEvent {
  if (!value || typeof value !== 'object') return false
  const event = value as Record<string, unknown>
  return (
    typeof event.articleId === 'string' &&
    (event.locale === 'th' || event.locale === 'en') &&
    (event.type === 'view' || (event.type === 'dwell' && Number.isFinite(event.seconds)))
  )
}

// navigator.sendBeacon posts a text/plain Blob to dodge the CORS preflight, so the
// payload arrives as a string rather than a parsed object.
function parseEvent(body: unknown): BlogEvent | null {
  if (typeof body !== 'string') return isBlogEvent(body) ? body : null
  try {
    const parsed: unknown = JSON.parse(body)
    return isBlogEvent(parsed) ? parsed : null
  } catch {
    return null
  }
}

export function createBlogPublicModule({
  now = () => new Date(),
  ingestSecret = env.CMS_INGEST_SECRET ?? '',
}: BlogPublicDeps = {}) {
  return new Elysia({ name: 'blog-public', prefix: '/api/public/blog' })
    .get('/feed', async ({ set }) => {
      set.headers['cache-control'] = 'no-store'
      return { articles: await listPublishedArticles() }
    }, {
      response: { 200: BlogFeedResponse },
      detail: { tags: ['CMS'], summary: 'Published blog articles for the landing build' },
    })

    .options('/events', ({ request, set, status }) => {
      if (request.headers.get('origin') === env.LANDING_URL) {
        set.headers['access-control-allow-origin'] = env.LANDING_URL
        set.headers['access-control-allow-methods'] = 'POST, OPTIONS'
        set.headers['access-control-allow-headers'] = 'content-type'
        set.headers.vary = 'Origin'
      }
      return status(204, undefined)
    }, {
      response: { 204: NoContentResponse },
      detail: { tags: ['CMS'], summary: 'CORS preflight for the blog beacon' },
    })

    // Always 204: the beacon is fire-and-forget and must never tell a caller whether an
    // article id exists.
    .post('/events', async ({ request, body, set, status }) => {
      set.headers['cache-control'] = 'no-store'
      if (request.headers.get('origin') === env.LANDING_URL) {
        set.headers['access-control-allow-origin'] = env.LANDING_URL
        set.headers.vary = 'Origin'
      }

      const event = parseEvent(body)
      const ip = clientIp(request)
      // a real reader sends 2 beacons per article; 120 per 10 min is far above human
      // browsing and still caps a single IP's ability to inflate view counts
      if (event && hitRateLimit(`blog-events:${ip}`, 120, 10 * 60_000)) {
        const at = now()
        const visitor = visitorHash(ingestSecret, at, ip, request.headers.get('user-agent') ?? '')
        await recordBlogEvent(event, visitor, at)
      }

      return status(204, undefined)
    }, {
      body: t.Unknown(),
      response: { 204: NoContentResponse },
      detail: { tags: ['CMS'], summary: 'Record a blog view or dwell beacon' },
    })
}

export const blogPublicModule = createBlogPublicModule()
