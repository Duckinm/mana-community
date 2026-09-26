import { articles, articleEvents } from '@mana/db'
import type { ArticleContentType, ArticleStatus } from '@mana/db'
import { and, count, desc, eq, gte, isNull, lt, sql, type SQL } from 'drizzle-orm'
import { db } from '@api/db'
import { addCalendarDays } from '@api/lib/calendar-date'
import { bangkokCalendarDate, bangkokDayStart } from '@api/modules/cms/publish-window'

const DAILY_CONTENT_TYPES: ArticleContentType[] = ['evergreen']
const DEFAULT_RANGE_DAYS = 30
const MAX_RANGE_DAYS = 366
const DAILY_PIECES = DAILY_CONTENT_TYPES.length
const GAP_WINDOW_DAYS = 7

export type DailyPoint = { date: string; views: number; avgDwellSeconds: number }

export type ArticleReport = {
  totals: { views: number; avgDwellSeconds: number }
  daily: DailyPoint[]
}

export type ReportsOverview = {
  articles: {
    id: string
    titleTh: string | null
    titleEn: string | null
    contentType: ArticleContentType
    publishedAt: string | null
    views: number
    avgDwellSeconds: number
  }[]
  daily: { date: string; views: number }[]
}

export type DashboardToday = {
  date: string
  pieces: {
    contentType: ArticleContentType
    articleId: string | null
    status: ArticleStatus | null
    publishAt: string | null
  }[]
  gapDates: string[]
}

// Reporting days are Bangkok days: the business, the Publish Window, and the audience all
// live in +07:00, so UTC bucketing would split a morning's traffic across two dates.
const bangkokDay = sql<string>`to_char(${articleEvents.occurredAt} AT TIME ZONE 'Asia/Bangkok', 'YYYY-MM-DD')`

const viewCount = sql<number>`count(*) filter (where ${articleEvents.type} = 'view')`
const dwellCount = sql<number>`count(*) filter (where ${articleEvents.type} = 'dwell')`
const dwellSum = sql<number>`coalesce(sum(${articleEvents.dwellSeconds}) filter (where ${articleEvents.type} = 'dwell'), 0)`

function average(sum: number, samples: number): number {
  return samples > 0 ? Math.round(sum / samples) : 0
}

function datesBetween(from: string, to: string): string[] {
  const dates: string[] = []
  for (let date = from; date <= to && dates.length <= MAX_RANGE_DAYS; date = addCalendarDays(date, 1)) {
    dates.push(date)
  }
  return dates
}

/** Clamps a caller-supplied range to at most a year, defaulting to the last 30 Bangkok days. */
export function resolveRange(now: Date, from?: string, to?: string): { from: string; to: string } {
  const today = bangkokCalendarDate(now)
  const end = to || today
  const start = from || addCalendarDays(end, -(DEFAULT_RANGE_DAYS - 1))
  const earliest = addCalendarDays(end, -(MAX_RANGE_DAYS - 1))
  return { from: start < earliest ? earliest : start, to: end }
}

function rangeBounds(range: { from: string; to: string }) {
  return {
    start: bangkokDayStart(range.from),
    end: bangkokDayStart(addCalendarDays(range.to, 1)),
  }
}

async function dailyRows(conditions: SQL[]) {
  const rows = await db
    .select({ date: bangkokDay, views: viewCount, dwells: dwellCount, dwellSeconds: dwellSum })
    .from(articleEvents)
    .where(and(...conditions))
    .groupBy(bangkokDay)
  return rows.map((row) => ({
    date: row.date,
    views: Number(row.views),
    dwells: Number(row.dwells),
    dwellSeconds: Number(row.dwellSeconds),
  }))
}

export async function articleReport(
  articleId: string,
  now: Date,
  from?: string,
  to?: string,
): Promise<ArticleReport> {
  const range = resolveRange(now, from, to)
  const { start, end } = rangeBounds(range)

  const rows = await dailyRows([
    eq(articleEvents.articleId, articleId),
    gte(articleEvents.occurredAt, start),
    lt(articleEvents.occurredAt, end),
  ])

  const byDate = new Map(rows.map((row) => [row.date, row]))
  const daily = datesBetween(range.from, range.to).map((date) => {
    const row = byDate.get(date)
    return {
      date,
      views: row?.views ?? 0,
      avgDwellSeconds: average(row?.dwellSeconds ?? 0, row?.dwells ?? 0),
    }
  })

  const totals = rows.reduce(
    (acc, row) => ({
      views: acc.views + row.views,
      dwells: acc.dwells + row.dwells,
      dwellSeconds: acc.dwellSeconds + row.dwellSeconds,
    }),
    { views: 0, dwells: 0, dwellSeconds: 0 },
  )

  return {
    totals: { views: totals.views, avgDwellSeconds: average(totals.dwellSeconds, totals.dwells) },
    daily,
  }
}

export async function reportsOverview(now: Date): Promise<ReportsOverview> {
  const range = resolveRange(now)
  const { start, end } = rangeBounds(range)

  const published = await db
    .select({
      id: articles.id,
      titleTh: articles.titleTh,
      titleEn: articles.titleEn,
      contentType: articles.contentType,
      publishedAt: articles.publishedAt,
    })
    .from(articles)
    .where(and(eq(articles.status, 'published'), isNull(articles.deletedAt)))
    .orderBy(desc(articles.publishedAt))

  // per-article numbers are lifetime; the trend line below is the last 30 days
  const perArticle = await db
    .select({
      articleId: articleEvents.articleId,
      views: viewCount,
      dwells: dwellCount,
      dwellSeconds: dwellSum,
    })
    .from(articleEvents)
    .groupBy(articleEvents.articleId)
  const stats = new Map(perArticle.map((row) => [row.articleId, row]))

  const rows = await dailyRows([gte(articleEvents.occurredAt, start), lt(articleEvents.occurredAt, end)])
  const byDate = new Map(rows.map((row) => [row.date, row]))

  return {
    articles: published.map((article) => {
      const row = stats.get(article.id)
      return {
        id: article.id,
        titleTh: article.titleTh,
        titleEn: article.titleEn,
        contentType: article.contentType,
        publishedAt: article.publishedAt?.toISOString() ?? null,
        views: Number(row?.views ?? 0),
        avgDwellSeconds: average(Number(row?.dwellSeconds ?? 0), Number(row?.dwells ?? 0)),
      }
    }),
    daily: datesBetween(range.from, range.to).map((date) => ({
      date,
      views: byDate.get(date)?.views ?? 0,
    })),
  }
}

/**
 * Completed Bangkok days in the last week that did not get the planned AI-generated
 * Article. Today is excluded: the generator runs before creating today's Article, so
 * counting today would flag a gap every single day.
 */
export async function gapDates(now: Date): Promise<string[]> {
  const to = addCalendarDays(bangkokCalendarDate(now), -1)
  const from = addCalendarDays(to, -(GAP_WINDOW_DAYS - 1))

  const articleDay = sql<string>`to_char(${articles.createdAt} AT TIME ZONE 'Asia/Bangkok', 'YYYY-MM-DD')`
  const perDay = await db
    .select({ date: articleDay, total: count() })
    .from(articles)
    .where(
      and(
        eq(articles.generatedBy, 'ai'),
        isNull(articles.deletedAt),
        gte(articles.createdAt, bangkokDayStart(from)),
        lt(articles.createdAt, bangkokDayStart(addCalendarDays(to, 1))),
      ),
    )
    .groupBy(articleDay)
  const counts = new Map(perDay.map((row) => [row.date, Number(row.total)]))

  return datesBetween(from, to).filter((day) => (counts.get(day) ?? 0) < DAILY_PIECES)
}

export async function dashboardToday(now: Date): Promise<DashboardToday> {
  const date = bangkokCalendarDate(now)
  const dayStart = bangkokDayStart(date)
  const dayEnd = bangkokDayStart(addCalendarDays(date, 1))

  const todaysPieces = await db
    .select({
      id: articles.id,
      contentType: articles.contentType,
      status: articles.status,
      publishAt: articles.publishAt,
      createdAt: articles.createdAt,
    })
    .from(articles)
    .where(
      and(
        eq(articles.generatedBy, 'ai'),
        isNull(articles.deletedAt),
        gte(articles.createdAt, dayStart),
        lt(articles.createdAt, dayEnd),
      ),
    )
    .orderBy(desc(articles.createdAt))

  return {
    date,
    pieces: DAILY_CONTENT_TYPES.map((contentType) => {
      const piece = todaysPieces.find((row) => row.contentType === contentType)
      return {
        contentType,
        articleId: piece?.id ?? null,
        status: piece?.status ?? null,
        publishAt: piece?.publishAt?.toISOString() ?? null,
      }
    }),
    gapDates: await gapDates(now),
  }
}

/** Titles the Generator should avoid repeating. */
export async function recentTitles(now: Date, days = 14): Promise<string[]> {
  const from = bangkokDayStart(addCalendarDays(bangkokCalendarDate(now), -(days - 1)))
  const rows = await db
    .select({ titleTh: articles.titleTh, titleEn: articles.titleEn })
    .from(articles)
    .where(and(isNull(articles.deletedAt), gte(articles.createdAt, from)))
    .orderBy(desc(articles.createdAt))

  return rows.flatMap((row) => [row.titleTh, row.titleEn].filter((title): title is string => Boolean(title)))
}
