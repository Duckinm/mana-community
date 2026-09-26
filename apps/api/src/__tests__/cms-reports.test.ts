import { afterEach, describe, expect, it, mock } from 'bun:test'
import { articleEvents, articles } from '@mana/db'
import { inArray } from 'drizzle-orm'
import Elysia from 'elysia'
import { db } from '@api/db'

mock.module('../lib/auth-plugin', () => ({
  betterAuthPlugin: new Elysia({ name: 'better-auth' }).macro({
    auth: { resolve: () => ({ user: { id: 'test-admin' } }) },
    admin: { resolve: () => ({ user: { id: 'test-admin' } }) },
  }),
}))

const { createCmsModule } = await import('@api/modules/cms/index')

// 2026-07-30 12:00 Bangkok
const clock = new Date('2026-07-30T05:00:00.000Z')

function app() {
  return new Elysia().use(createCmsModule({ triggerRebuild: async () => {}, now: () => clock }))
}

async function get(path: string) {
  const response = await app().handle(new Request(`http://localhost/api/cms${path}`))
  return { status: response.status, body: await response.json() }
}

const createdIds: string[] = []

async function seedArticle(values: Partial<typeof articles.$inferInsert> = {}) {
  const [row] = await db
    .insert(articles)
    .values({
      titleEn: 'Report target',
      titleTh: 'บทความรายงาน',
      slugEn: `report-target-${crypto.randomUUID()}`,
      status: 'published',
      publishedAt: clock,
      createdAt: clock,
      updatedAt: clock,
      ...values,
    })
    .returning()
  createdIds.push(row.id)
  return row
}

async function seedEvent(articleId: string, occurredAt: string, type: 'view' | 'dwell', seconds?: number) {
  await db.insert(articleEvents).values({
    articleId,
    type,
    dwellSeconds: seconds ?? null,
    visitorHash: 'test-visitor',
    locale: 'en',
    occurredAt: new Date(occurredAt),
  })
}

afterEach(async () => {
  const ids = createdIds.splice(0)
  if (ids.length > 0) await db.delete(articles).where(inArray(articles.id, ids))
})

describe('GET /api/cms/reports/article/:id', () => {
  it('buckets events into Bangkok days and pads the range', async () => {
    const article = await seedArticle()
    // 19:00Z on the 29th is already the 30th in Bangkok
    await seedEvent(article.id, '2026-07-29T19:00:00.000Z', 'view')
    await seedEvent(article.id, '2026-07-30T02:00:00.000Z', 'view')
    await seedEvent(article.id, '2026-07-30T02:30:00.000Z', 'dwell', 40)
    await seedEvent(article.id, '2026-07-30T03:00:00.000Z', 'dwell', 60)
    await seedEvent(article.id, '2026-07-28T05:00:00.000Z', 'view')

    const { body } = await get(`/reports/article/${article.id}?from=2026-07-28&to=2026-07-30`)

    expect(body.totals).toEqual({ views: 3, avgDwellSeconds: 50 })
    expect(body.daily).toEqual([
      { date: '2026-07-28', views: 1, avgDwellSeconds: 0 },
      { date: '2026-07-29', views: 0, avgDwellSeconds: 0 },
      { date: '2026-07-30', views: 2, avgDwellSeconds: 50 },
    ])
  })

  it('defaults to the last 30 Bangkok days', async () => {
    const article = await seedArticle()
    const { body } = await get(`/reports/article/${article.id}`)

    expect(body.daily).toHaveLength(30)
    expect(body.daily.at(-1).date).toBe('2026-07-30')
    expect(body.daily[0].date).toBe('2026-07-01')
    expect(body.totals).toEqual({ views: 0, avgDwellSeconds: 0 })
  })

  it('404s for an unknown article and 422s on a malformed range', async () => {
    expect((await get(`/reports/article/${crypto.randomUUID()}`)).status).toBe(404)
    const article = await seedArticle()
    expect((await get(`/reports/article/${article.id}?from=yesterday`)).status).toBe(422)
  })
})

describe('GET /api/cms/reports/overview', () => {
  it('reports lifetime views per published article and a daily trend', async () => {
    // the daily trend spans every article, so measure the delta this test causes
    const before = (await get('/reports/overview')).body.daily.at(-1).views
    const article = await seedArticle()
    await seedEvent(article.id, '2026-07-30T02:00:00.000Z', 'view')
    await seedEvent(article.id, '2026-07-30T02:00:00.000Z', 'dwell', 30)
    await seedEvent(article.id, '2026-01-01T02:00:00.000Z', 'view')

    const { body } = await get('/reports/overview')
    const row = body.articles.find((entry: { id: string }) => entry.id === article.id)

    expect(row.views).toBe(2)
    expect(row.avgDwellSeconds).toBe(30)
    expect(row.titleTh).toBe('บทความรายงาน')
    expect(body.daily).toHaveLength(30)
    expect(body.daily.at(-1).date).toBe('2026-07-30')
    expect(body.daily.at(-1).views - before).toBe(1)
  })

  it('excludes drafts and soft-deleted articles', async () => {
    const draft = await seedArticle({ status: 'draft', publishedAt: null })
    const deleted = await seedArticle({ deletedAt: clock })

    const { body } = await get('/reports/overview')
    const ids = body.articles.map((entry: { id: string }) => entry.id)
    expect(ids).not.toContain(draft.id)
    expect(ids).not.toContain(deleted.id)
  })
})

describe('GET /api/cms/dashboard/today', () => {
  it('shows the daily evergreen slot and counts one generated article as a complete day', async () => {
    const evergreen = await seedArticle({
      contentType: 'evergreen',
      generatedBy: 'ai',
      status: 'scheduled',
      publishAt: new Date('2026-07-30T02:20:00.000Z'),
      publishedAt: null,
    })
    const completeDay = new Date('2026-07-29T05:00:00.000Z')
    await seedArticle({
      contentType: 'evergreen',
      generatedBy: 'ai',
      createdAt: completeDay,
    })

    const { body } = await get('/dashboard/today')

    expect(body.date).toBe('2026-07-30')
    expect(body.pieces.map((piece: { contentType: string }) => piece.contentType)).toEqual(['evergreen'])

    const slot = body.pieces.find((piece: { contentType: string }) => piece.contentType === 'evergreen')
    expect(slot.articleId).toBe(evergreen.id)
    expect(slot.status).toBe('scheduled')
    expect(slot.publishAt).toBe('2026-07-30T02:20:00.000Z')

    expect(body.gapDates).not.toContain('2026-07-30')
    expect(body.gapDates).not.toContain('2026-07-29')
    expect(body.gapDates.length).toBeLessThanOrEqual(7)
  })

  it('ignores human-written articles', async () => {
    await seedArticle({ contentType: 'evergreen', generatedBy: 'human' })

    const { body } = await get('/dashboard/today')
    const slot = body.pieces.find((piece: { contentType: string }) => piece.contentType === 'evergreen')
    expect(slot.articleId).toBeNull()
  })
})
