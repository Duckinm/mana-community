import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test'
import { articles } from '@mana/db'
import { eq, inArray } from 'drizzle-orm'
import Elysia from 'elysia'
import { db } from '@api/db'

mock.module('../lib/auth-plugin', () => ({
  betterAuthPlugin: new Elysia({ name: 'better-auth' }).macro({
    auth: { resolve: () => ({ user: { id: 'test-admin' } }) },
    admin: { resolve: () => ({ user: { id: 'test-admin' } }) },
  }),
}))

const { createCmsModule } = await import('@api/modules/cms/index')

let clock = new Date('2026-07-30T05:00:00.000Z')
let rebuildCalls = 0

function app() {
  return new Elysia().use(
    createCmsModule({
      triggerRebuild: async () => {
        rebuildCalls++
      },
      now: () => clock,
    }),
  )
}

async function call(path: string, init: RequestInit = {}) {
  const headers = init.body ? { 'content-type': 'application/json' } : undefined
  return app().handle(new Request(`http://localhost/api/cms${path}`, { headers, ...init }))
}

async function post(path: string, body?: unknown) {
  return call(path, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
}

const createdIds: string[] = []

async function createArticle(body: Record<string, unknown> = {}) {
  const response = await post('/articles', {
    titleTh: 'วิธีออกใบแจ้งหนี้ สำหรับฟรีแลนซ์',
    titleEn: 'How to Invoice Clients in Thailand (2026)',
    bodyMdTh: '# หัวข้อ',
    bodyMdEn: '# Heading',
    ...body,
  })
  expect(response.status).toBe(201)
  const article = await response.json()
  createdIds.push(article.id)
  return article
}

beforeEach(() => {
  clock = new Date('2026-07-30T05:00:00.000Z')
  rebuildCalls = 0
})

afterEach(async () => {
  const ids = createdIds.splice(0)
  if (ids.length > 0) await db.delete(articles).where(inArray(articles.id, ids))
})

describe('POST /api/cms/articles', () => {
  it('creates a human draft and derives both slugs from the titles', async () => {
    const article = await createArticle()

    expect(article.status).toBe('draft')
    expect(article.generatedBy).toBe('human')
    expect(article.contentType).toBe('trend')
    expect(article.slugEn).toBe('how-to-invoice-clients-in-thailand-2026')
    expect(article.slugTh).toBe('วิธีออกใบแจ้งหนี้-สำหรับฟรีแลนซ์')
    expect(article.publishAt).toBeNull()
    expect(article.publishedAt).toBeNull()
    expect(article.viewCount).toBe(0)
    expect(article.createdAt).toBe(clock.toISOString())
  })

  it('keeps explicitly supplied slugs and content type', async () => {
    const article = await createArticle({
      slugEn: 'custom-slug',
      slugTh: 'สลัก-ไทย',
      contentType: 'evergreen',
    })

    expect(article.slugEn).toBe('custom-slug')
    expect(article.slugTh).toBe('สลัก-ไทย')
    expect(article.contentType).toBe('evergreen')
  })

  it('suffixes a slug that another live article already uses', async () => {
    await createArticle({ slugEn: 'duplicate-slug', slugTh: null, titleTh: null })
    const second = await createArticle({ slugEn: 'duplicate-slug', slugTh: null, titleTh: null })

    expect(second.slugEn).toBe('duplicate-slug-2')
  })

  it('leaves slugs null when the locale side has no title', async () => {
    const article = await createArticle({ titleTh: null, bodyMdTh: null })

    expect(article.slugTh).toBeNull()
    expect(article.titleTh).toBeNull()
  })

  it('rejects an unknown content type', async () => {
    const response = await post('/articles', { titleEn: 'X', contentType: 'listicle' })

    expect(response.status).toBe(422)
  })
})

describe('GET /api/cms/articles', () => {
  it('lists newest first with view counts and filters by status, type, and query', async () => {
    const evergreen = await createArticle({
      titleEn: 'Evergreen Guide For Freelancers',
      titleTh: null,
      bodyMdTh: null,
      contentType: 'evergreen',
    })
    clock = new Date('2026-07-30T06:00:00.000Z')
    const trend = await createArticle({ titleEn: 'Trend Report', titleTh: null, bodyMdTh: null })

    const all = await (await call('/articles')).json()
    const ids = all.articles.map((a: { id: string }) => a.id)
    expect(ids.indexOf(trend.id)).toBeLessThan(ids.indexOf(evergreen.id))
    expect(all.articles[ids.indexOf(trend.id)].viewCount).toBe(0)

    const byType = await (await call('/articles?contentType=evergreen')).json()
    expect(byType.articles.map((a: { id: string }) => a.id)).toContain(evergreen.id)
    expect(byType.articles.map((a: { id: string }) => a.id)).not.toContain(trend.id)

    const byQuery = await (await call('/articles?q=trend+report')).json()
    expect(byQuery.articles.map((a: { id: string }) => a.id)).toEqual([trend.id])

    const byStatus = await (await call('/articles?status=published')).json()
    expect(byStatus.articles.map((a: { id: string }) => a.id)).not.toContain(trend.id)
  })

  it('treats cleared filters as no filter', async () => {
    const article = await createArticle({ titleTh: null, bodyMdTh: null })

    const response = await call('/articles?status=&contentType=&q=')

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.articles.map((a: { id: string }) => a.id)).toContain(article.id)
  })

  it('rejects an unknown status filter', async () => {
    expect((await call('/articles?status=archived')).status).toBe(422)
  })
})

describe('GET /api/cms/articles/:id', () => {
  it('returns one article and 404s for an unknown id', async () => {
    const article = await createArticle()

    const found = await call(`/articles/${article.id}`)
    expect(found.status).toBe(200)
    expect((await found.json()).id).toBe(article.id)

    expect((await call('/articles/does-not-exist')).status).toBe(404)
  })
})

describe('PATCH /api/cms/articles/:id', () => {
  it('edits content without rebuilding the landing site', async () => {
    const article = await createArticle()
    await post(`/articles/${article.id}/publish`)
    rebuildCalls = 0

    const response = await call(`/articles/${article.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ titleEn: 'Edited Title', metaDescriptionEn: 'Edited meta' }),
    })

    expect(response.status).toBe(200)
    const updated = await response.json()
    expect(updated.titleEn).toBe('Edited Title')
    expect(updated.metaDescriptionEn).toBe('Edited meta')
    expect(updated.status).toBe('published')
    expect(rebuildCalls).toBe(0)
  })

  it('re-derives a slug when the caller clears it', async () => {
    const article = await createArticle()

    const response = await call(`/articles/${article.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ titleEn: 'A Brand New Title', slugEn: '' }),
    })

    expect((await response.json()).slugEn).toBe('a-brand-new-title')
  })

  it('404s for an unknown id', async () => {
    const response = await call('/articles/does-not-exist', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ titleEn: 'X' }),
    })

    expect(response.status).toBe(404)
  })
})

describe('DELETE /api/cms/articles/:id', () => {
  it('soft-deletes a draft without rebuilding and hides it from the list', async () => {
    const article = await createArticle()

    const response = await call(`/articles/${article.id}`, { method: 'DELETE' })
    expect(response.status).toBe(200)
    expect(rebuildCalls).toBe(0)

    const [row] = await db.select().from(articles).where(eq(articles.id, article.id))
    expect(row.deletedAt).not.toBeNull()

    const list = await (await call('/articles')).json()
    expect(list.articles.map((a: { id: string }) => a.id)).not.toContain(article.id)
    expect((await call(`/articles/${article.id}`)).status).toBe(404)
  })

  it('rebuilds the landing site when the deleted article was published', async () => {
    const article = await createArticle()
    await post(`/articles/${article.id}/publish`)
    rebuildCalls = 0

    await call(`/articles/${article.id}`, { method: 'DELETE' })

    expect(rebuildCalls).toBe(1)
  })

  it('frees the slug for a new article', async () => {
    const first = await createArticle({ slugEn: 'reusable-slug', titleTh: null, bodyMdTh: null })
    await call(`/articles/${first.id}`, { method: 'DELETE' })

    const second = await createArticle({ slugEn: 'reusable-slug', titleTh: null, bodyMdTh: null })
    expect(second.slugEn).toBe('reusable-slug')
  })
})

describe('POST /api/cms/articles/:id/publish', () => {
  it('publishes a draft, stamps publishedAt, and rebuilds once', async () => {
    const article = await createArticle()

    const response = await post(`/articles/${article.id}/publish`)

    expect(response.status).toBe(200)
    const published = await response.json()
    expect(published.status).toBe('published')
    expect(published.publishedAt).toBe(clock.toISOString())
    expect(published.publishAt).toBeNull()
    expect(rebuildCalls).toBe(1)
  })

  it('conflicts when the article is already published', async () => {
    const article = await createArticle()
    await post(`/articles/${article.id}/publish`)

    const response = await post(`/articles/${article.id}/publish`)

    expect(response.status).toBe(409)
    expect(rebuildCalls).toBe(1)
  })

  it('404s for an unknown id', async () => {
    expect((await post('/articles/does-not-exist/publish')).status).toBe(404)
  })
})

describe('POST /api/cms/articles/:id/unpublish', () => {
  it('returns a published article to draft and rebuilds', async () => {
    const article = await createArticle()
    await post(`/articles/${article.id}/publish`)
    rebuildCalls = 0

    const response = await post(`/articles/${article.id}/unpublish`)

    expect(response.status).toBe(200)
    const drafted = await response.json()
    expect(drafted.status).toBe('draft')
    expect(drafted.publishedAt).toBeNull()
    expect(rebuildCalls).toBe(1)
  })

  it('conflicts when the article is not published', async () => {
    const article = await createArticle()

    const response = await post(`/articles/${article.id}/unpublish`)

    expect(response.status).toBe(409)
    expect(rebuildCalls).toBe(0)
  })
})

describe('POST /api/cms/articles/:id/schedule', () => {
  it('schedules the next publish window slot when no timestamp is given', async () => {
    const article = await createArticle()

    const response = await post(`/articles/${article.id}/schedule`)

    expect(response.status).toBe(200)
    const scheduled = await response.json()
    expect(scheduled.status).toBe('scheduled')
    expect(scheduled.publishedAt).toBeNull()

    // 05:00Z is past 09:00 Asia/Bangkok (02:00Z), so the slot lands on the next day
    // at 09:00 +/- 40 min jitter plus 0-15 min stagger.
    const publishAt = new Date(scheduled.publishAt).getTime()
    const base = new Date('2026-07-31T02:00:00.000Z').getTime()
    expect(publishAt).toBeGreaterThan(clock.getTime())
    expect(publishAt).toBeGreaterThanOrEqual(base - 40 * 60_000)
    expect(publishAt).toBeLessThanOrEqual(base + 55 * 60_000)
    expect(rebuildCalls).toBe(0)
  })

  it('uses the same-day window when the base hour is still ahead', async () => {
    clock = new Date('2026-07-30T00:30:00.000Z')
    const article = await createArticle()

    const scheduled = await (await post(`/articles/${article.id}/schedule`)).json()

    const publishAt = new Date(scheduled.publishAt).getTime()
    const base = new Date('2026-07-30T02:00:00.000Z').getTime()
    expect(publishAt).toBeGreaterThan(clock.getTime())
    expect(publishAt).toBeLessThanOrEqual(base + 55 * 60_000)
  })

  it('accepts an explicit publishAt', async () => {
    const article = await createArticle()

    const scheduled = await (
      await post(`/articles/${article.id}/schedule`, { publishAt: '2026-08-05T02:10:00.000Z' })
    ).json()

    expect(scheduled.publishAt).toBe('2026-08-05T02:10:00.000Z')
    expect(scheduled.status).toBe('scheduled')
  })

  it('rejects an unparseable publishAt', async () => {
    const article = await createArticle()

    const response = await post(`/articles/${article.id}/schedule`, { publishAt: 'not-a-date' })

    expect(response.status).toBe(400)
  })

  it('conflicts when the article is published', async () => {
    const article = await createArticle()
    await post(`/articles/${article.id}/publish`)

    const response = await post(`/articles/${article.id}/schedule`)

    expect(response.status).toBe(409)
  })
})
