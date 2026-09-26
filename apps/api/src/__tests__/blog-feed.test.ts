import { afterEach, describe, expect, it, mock } from 'bun:test'
import { articles } from '@mana/db'
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
const { blogPublicModule } = await import('@api/modules/cms/public')

const clock = new Date('2026-07-30T05:00:00.000Z')

function app() {
  return new Elysia()
    .use(createCmsModule({ triggerRebuild: async () => {}, now: () => clock }))
    .use(blogPublicModule)
}

async function post(path: string, body?: unknown) {
  return app().handle(
    new Request(`http://localhost${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
  )
}

const createdIds: string[] = []

async function article(body: Record<string, unknown>) {
  const created = await (await post('/api/cms/articles', body)).json()
  createdIds.push(created.id)
  return created
}

async function feed() {
  const response = await app().handle(new Request('http://localhost/api/public/blog/feed'))
  return { response, body: await response.json() }
}

afterEach(async () => {
  const ids = createdIds.splice(0)
  if (ids.length > 0) await db.delete(articles).where(inArray(articles.id, ids))
})

describe('GET /api/public/blog/feed', () => {
  it('returns published articles in the shape the landing build consumes', async () => {
    const created = await article({
      titleTh: 'บทความไทย',
      titleEn: 'Bilingual Article',
      bodyMdTh: '# ไทย',
      bodyMdEn: '# English',
      metaDescriptionTh: 'คำอธิบาย',
      metaDescriptionEn: 'Description',
      contentType: 'comparison',
    })
    await post(`/api/cms/articles/${created.id}/publish`)

    const { response, body } = await feed()

    expect(response.status).toBe(200)
    expect(response.headers.get('cache-control')).toBe('no-store')

    const entry = body.articles.find((a: { id: string }) => a.id === created.id)
    expect(entry).toEqual({
      id: created.id,
      slugTh: created.slugTh,
      slugEn: created.slugEn,
      titleTh: 'บทความไทย',
      titleEn: 'Bilingual Article',
      bodyMdTh: '# ไทย',
      bodyMdEn: '# English',
      metaDescriptionTh: 'คำอธิบาย',
      metaDescriptionEn: 'Description',
      contentType: 'comparison',
      publishedAt: clock.toISOString(),
      updatedAt: clock.toISOString(),
    })
  })

  it('excludes drafts, scheduled articles, and soft-deleted articles', async () => {
    const draft = await article({ titleEn: 'Draft Only', bodyMdEn: '# D' })

    const scheduled = await article({ titleEn: 'Scheduled Only', bodyMdEn: '# S' })
    await post(`/api/cms/articles/${scheduled.id}/schedule`)

    const deleted = await article({ titleEn: 'Deleted Article', bodyMdEn: '# X' })
    await post(`/api/cms/articles/${deleted.id}/publish`)
    await app().handle(
      new Request(`http://localhost/api/cms/articles/${deleted.id}`, { method: 'DELETE' }),
    )

    const { body } = await feed()
    const ids = body.articles.map((a: { id: string }) => a.id)

    expect(ids).not.toContain(draft.id)
    expect(ids).not.toContain(scheduled.id)
    expect(ids).not.toContain(deleted.id)
  })

  it('keeps a single-locale article with the missing side null', async () => {
    const created = await article({ titleEn: 'English Only Piece', bodyMdEn: '# EN' })
    await post(`/api/cms/articles/${created.id}/publish`)

    const { body } = await feed()
    const entry = body.articles.find((a: { id: string }) => a.id === created.id)

    expect(entry.titleTh).toBeNull()
    expect(entry.bodyMdTh).toBeNull()
    expect(entry.slugTh).toBeNull()
    expect(entry.slugEn).toBe('english-only-piece')
  })
})
