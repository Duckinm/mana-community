import { afterEach, describe, expect, it } from 'bun:test'
import { articleEvents, articles } from '@mana/db'
import { eq, inArray } from 'drizzle-orm'
import Elysia from 'elysia'
import { db } from '@api/db'
import { env } from '@api/env'
import { createBlogPublicModule } from '@api/modules/cms/public'

const INGEST_SECRET = 'test-ingest-secret'
const clock = new Date('2026-07-30T05:00:00.000Z')

const app = new Elysia().use(
  createBlogPublicModule({ now: () => clock, ingestSecret: INGEST_SECRET }),
)

function beacon(body: unknown, init: RequestInit = {}) {
  return app.handle(
    new Request('http://localhost/api/public/blog/events', {
      ...init,
      method: 'POST',
      headers: { 'content-type': 'text/plain', origin: env.LANDING_URL, ...init.headers },
      body: typeof body === 'string' ? body : JSON.stringify(body),
    }),
  )
}

const createdIds: string[] = []

async function seedArticle() {
  const [row] = await db
    .insert(articles)
    .values({
      titleEn: 'Beacon target',
      slugEn: `beacon-target-${crypto.randomUUID()}`,
      status: 'published',
      publishedAt: clock,
      createdAt: clock,
      updatedAt: clock,
    })
    .returning()
  createdIds.push(row.id)
  return row
}

function eventsFor(articleId: string) {
  return db.select().from(articleEvents).where(eq(articleEvents.articleId, articleId))
}

afterEach(async () => {
  const ids = createdIds.splice(0)
  if (ids.length > 0) await db.delete(articles).where(inArray(articles.id, ids))
})

describe('POST /api/public/blog/events', () => {
  it('records a view from a text/plain sendBeacon body', async () => {
    const article = await seedArticle()
    const response = await beacon({ articleId: article.id, locale: 'en', type: 'view' })

    expect(response.status).toBe(204)
    expect(response.headers.get('access-control-allow-origin')).toBe(env.LANDING_URL)

    const [event] = await eventsFor(article.id)
    expect(event.type).toBe('view')
    expect(event.locale).toBe('en')
    expect(event.dwellSeconds).toBeNull()
    expect(event.visitorHash).toHaveLength(32)
  })

  it('never stores the raw ip and rotates the hash per day', async () => {
    const article = await seedArticle()
    const headers = { 'x-forwarded-for': '203.0.113.7', 'user-agent': 'beacon-test' }

    await beacon({ articleId: article.id, locale: 'th', type: 'view' }, { headers })

    const [event] = await eventsFor(article.id)
    expect(event.visitorHash).not.toContain('203.0.113.7')

    const tomorrow = new Elysia().use(
      createBlogPublicModule({
        now: () => new Date('2026-07-31T05:00:00.000Z'),
        ingestSecret: INGEST_SECRET,
      }),
    )
    await tomorrow.handle(
      new Request('http://localhost/api/public/blog/events', {
        method: 'POST',
        headers: { 'content-type': 'text/plain', ...headers },
        body: JSON.stringify({ articleId: article.id, locale: 'th', type: 'view' }),
      }),
    )

    const hashes = new Set((await eventsFor(article.id)).map((row) => row.visitorHash))
    expect(hashes.size).toBe(2)
  })

  it('clamps dwell seconds into 1..7200', async () => {
    const article = await seedArticle()
    await beacon({ articleId: article.id, locale: 'en', type: 'dwell', seconds: 99999 })
    await beacon({ articleId: article.id, locale: 'en', type: 'dwell', seconds: 0 })

    const seconds = (await eventsFor(article.id)).map((row) => row.dwellSeconds).sort((a, b) => a! - b!)
    expect(seconds).toEqual([1, 7200])
  })

  it('accepts an application/json body too', async () => {
    const article = await seedArticle()
    const response = await beacon(
      { articleId: article.id, locale: 'en', type: 'view' },
      { headers: { 'content-type': 'application/json' } },
    )

    expect(response.status).toBe(204)
    expect(await eventsFor(article.id)).toHaveLength(1)
  })

  it('answers 204 for unknown articles, deleted articles and junk payloads', async () => {
    const article = await seedArticle()
    await db.update(articles).set({ deletedAt: clock }).where(eq(articles.id, article.id))

    expect((await beacon({ articleId: article.id, locale: 'en', type: 'view' })).status).toBe(204)
    expect((await beacon({ articleId: crypto.randomUUID(), locale: 'en', type: 'view' })).status).toBe(204)
    expect((await beacon('not json at all')).status).toBe(204)
    expect((await beacon({ articleId: article.id, locale: 'fr', type: 'view' })).status).toBe(204)
    expect((await beacon({ articleId: article.id, locale: 'en', type: 'dwell' })).status).toBe(204)

    expect(await eventsFor(article.id)).toHaveLength(0)
  })

  it('stops recording once one ip floods the endpoint, still answering 204', async () => {
    const article = await seedArticle()
    const headers = { 'x-forwarded-for': `flood-${crypto.randomUUID()}` }
    const payload = { articleId: article.id, locale: 'en', type: 'view' }

    for (let sent = 0; sent < 120; sent++) await beacon(payload, { headers })
    const overflow = await beacon(payload, { headers })

    expect(overflow.status).toBe(204)
    expect(await eventsFor(article.id)).toHaveLength(120)
  })

  it('omits the CORS header for other origins', async () => {
    const article = await seedArticle()
    const response = await beacon(
      { articleId: article.id, locale: 'en', type: 'view' },
      { headers: { origin: 'https://evil.example' } },
    )

    expect(response.status).toBe(204)
    expect(response.headers.get('access-control-allow-origin')).toBeNull()
  })

  it('answers the preflight for the landing origin', async () => {
    const response = await app.handle(
      new Request('http://localhost/api/public/blog/events', {
        method: 'OPTIONS',
        headers: { origin: env.LANDING_URL },
      }),
    )

    expect(response.status).toBe(204)
    expect(response.headers.get('access-control-allow-origin')).toBe(env.LANDING_URL)
    expect(response.headers.get('access-control-allow-methods')).toContain('POST')
  })
})
