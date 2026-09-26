import { createHash } from 'node:crypto'
import { articles, articleEvents } from '@mana/db'
import type { CmsLocale } from '@mana/db'
import { and, eq, isNull } from 'drizzle-orm'
import { db } from '@api/db'
import { bangkokCalendarDate } from '@api/modules/cms/publish-window'

const MIN_DWELL_SECONDS = 1
const MAX_DWELL_SECONDS = 7200

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex')
}

/**
 * Buckets a visitor for the day without ever storing the raw IP: the per-day salt makes
 * yesterday's hashes useless for tracking, and the truncation keeps the column short.
 */
export function visitorHash(secret: string, at: Date, ip: string, userAgent: string): string {
  const dailySalt = sha256(secret + bangkokCalendarDate(at))
  return sha256(dailySalt + ip + userAgent).slice(0, 32)
}

export function clampDwellSeconds(seconds: number): number {
  return Math.min(Math.max(Math.round(seconds), MIN_DWELL_SECONDS), MAX_DWELL_SECONDS)
}

export type BlogEvent = {
  articleId: string
  locale: CmsLocale
  type: 'view' | 'dwell'
  seconds?: number
}

/** Silently ignores unknown or unpublished articles — a beacon must never probe the CMS. */
export async function recordBlogEvent(event: BlogEvent, visitor: string, at: Date): Promise<void> {
  const [article] = await db
    .select({ id: articles.id })
    .from(articles)
    .where(and(eq(articles.id, event.articleId), isNull(articles.deletedAt)))
  if (!article) return

  await db.insert(articleEvents).values({
    articleId: article.id,
    type: event.type,
    dwellSeconds: event.type === 'dwell' ? clampDwellSeconds(event.seconds ?? 0) : null,
    visitorHash: visitor,
    locale: event.locale,
    occurredAt: at,
  })
}
