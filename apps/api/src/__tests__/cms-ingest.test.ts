import { afterAll, afterEach, describe, expect, it, mock } from 'bun:test'
import { articles, cmsKeywords } from '@mana/db'
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
const { readCmsSettings, updateCmsSettings } = await import('@api/modules/cms/registry-service')
const { countWords } = await import('@api/modules/cms/ingest')

const INGEST_SECRET = 'test-ingest-secret'
const clock = new Date('2026-07-30T05:00:00.000Z')
const initialSettings = await readCmsSettings()

function app() {
  return new Elysia().use(
    createCmsModule({
      triggerRebuild: async () => {},
      now: () => clock,
      ingestSecret: INGEST_SECRET,
    }),
  )
}

async function ingest(pieces: Record<string, unknown>[], secret: string | null = INGEST_SECRET) {
  const headers: Record<string, string> = { 'content-type': 'application/json' }
  if (secret) headers['x-cms-ingest-secret'] = secret
  return app().handle(
    new Request('http://localhost/api/cms/ingest', {
      method: 'POST',
      headers,
      body: JSON.stringify({ pieces }),
    }),
  )
}

const englishBody = (words: number) => 'invoice '.repeat(words).trim()
const thaiBody = (words: number) => 'ฟรีแลนซ์ '.repeat(words).trim()

function piece(overrides: Record<string, unknown> = {}) {
  return {
    contentType: 'trend',
    titleTh: `แนวโน้มฟรีแลนซ์ ${crypto.randomUUID()}`,
    titleEn: `Freelance trends ${crypto.randomUUID()}`,
    bodyMdTh: thaiBody(600),
    bodyMdEn: englishBody(600),
    metaDescriptionTh: 'สรุปแนวโน้ม',
    metaDescriptionEn: 'Trend summary',
    ...overrides,
  }
}

const createdArticles: string[] = []
const createdKeywords: string[] = []

async function track(response: Response) {
  const body = await response.json()
  for (const article of body.created ?? []) createdArticles.push(article.id)
  return body
}

afterEach(async () => {
  const ids = createdArticles.splice(0)
  if (ids.length > 0) await db.delete(articles).where(inArray(articles.id, ids))
  await updateCmsSettings(initialSettings.autoPublish, clock)
})

afterAll(async () => {
  const ids = createdKeywords.splice(0)
  if (ids.length > 0) await db.delete(cmsKeywords).where(inArray(cmsKeywords.id, ids))
})

describe('countWords', () => {
  it('counts Thai without spaces and ignores English punctuation-only tokens', () => {
    expect(countWords('th', 'ฟรีแลนซ์ต้องออกใบแจ้งหนี้ทุกเดือน')).toBeGreaterThan(3)
    expect(countWords('en', 'one two — three')).toBe(3)
  })
})

describe('POST /api/cms/ingest', () => {
  it('rejects a request without the ingest secret', async () => {
    expect((await ingest([piece()], null)).status).toBe(401)
    expect((await ingest([piece()], 'wrong')).status).toBe(401)
  })

  it('rejects the whole batch when a piece is under the word minimum', async () => {
    const response = await ingest([
      piece(),
      piece({ contentType: 'evergreen', bodyMdEn: englishBody(700), bodyMdTh: thaiBody(900) }),
    ])

    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body.errors).toEqual([
      { index: 1, contentType: 'evergreen', locale: 'en', words: 700, minimum: 800 },
    ])

    const remaining = await app().handle(new Request('http://localhost/api/cms/articles'))
    const listed = await remaining.json()
    expect(listed.articles.some((row: { titleEn: string }) => row.titleEn.startsWith('Freelance trends'))).toBe(
      false,
    )
  })

  it('skips the word minimum for comparison and tutorial pieces', async () => {
    await updateCmsSettings(false, clock)
    const response = await ingest([piece({ contentType: 'comparison', bodyMdEn: englishBody(20), bodyMdTh: thaiBody(20) })])

    expect(response.status).toBe(201)
    const body = await track(response)
    expect(body.created[0].contentType).toBe('comparison')
  })

  it('schedules pieces in the publish window when autoPublish is on', async () => {
    await updateCmsSettings(true, clock)
    const response = await ingest([piece(), piece({ titleEn: 'Freelance trends two' })])

    expect(response.status).toBe(201)
    const body = await track(response)
    expect(body.created).toHaveLength(2)

    const [first, second] = body.created
    expect(first.status).toBe('scheduled')
    expect(second.status).toBe('scheduled')
    expect(new Date(first.publishAt).getTime()).toBeGreaterThan(clock.getTime())
    expect(new Date(second.publishAt).getTime()).toBeGreaterThan(new Date(first.publishAt).getTime())

    const stored = await (await app().handle(new Request(`http://localhost/api/cms/articles/${first.id}`))).json()
    expect(stored.generatedBy).toBe('ai')
    expect(stored.status).toBe('scheduled')
    expect(stored.publishAt).toBe(first.publishAt)
  })

  it('keeps pieces as drafts when autoPublish is off', async () => {
    await updateCmsSettings(false, clock)
    const body = await track(await ingest([piece()]))

    expect(body.created[0].status).toBe('draft')
    expect(body.created[0].publishAt).toBeNull()
  })

  it('resolves keywordTerm against the registry and tolerates unknown terms', async () => {
    const keyword = await (
      await app().handle(
        new Request('http://localhost/api/cms/keywords', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ term: `Freelance Invoice ${crypto.randomUUID()}` }),
        }),
      )
    ).json()
    createdKeywords.push(keyword.id)

    const body = await track(
      await ingest([
        piece({ keywordTerm: keyword.term.toUpperCase() }),
        piece({ keywordTerm: 'never seen before' }),
      ]),
    )

    const [matched, unmatched] = await Promise.all(
      body.created.map(async (created: { id: string }) =>
        (await app().handle(new Request(`http://localhost/api/cms/articles/${created.id}`))).json(),
      ),
    )
    expect(matched.keywordId).toBe(keyword.id)
    expect(unmatched.keywordId).toBeNull()
  })
})

describe('GET /api/cms/ingest/context', () => {
  async function context(secret: string | null = INGEST_SECRET) {
    const headers: Record<string, string> = {}
    if (secret) headers['x-cms-ingest-secret'] = secret
    return app().handle(new Request('http://localhost/api/cms/ingest/context', { headers }))
  }

  it('requires the ingest secret', async () => {
    expect((await context(null)).status).toBe(401)
  })

  it('rotates the generator target away from the keyword it just used', async () => {
    const create = async (term: string, priority: number) => {
      const response = await app().handle(
        new Request('http://localhost/api/cms/keywords', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ term, priority }),
        }),
      )
      const keyword = await response.json()
      createdKeywords.push(keyword.id)
      return keyword
    }

    const first = await create(`First topic ${crypto.randomUUID()}`, 100)
    const second = await create(`Second topic ${crypto.randomUUID()}`, 99)

    const before = await (await context()).json()
    expect(before.targetKeyword.term).toBe(first.term)

    const rejected = await ingest([piece({
      contentType: 'evergreen',
      keywordTerm: second.term,
      bodyMdEn: englishBody(900),
      bodyMdTh: thaiBody(900),
    })])
    expect(rejected.status).toBe(409)

    await track(await ingest([piece({
      contentType: 'evergreen',
      keywordTerm: first.term,
      bodyMdEn: englishBody(900),
      bodyMdTh: thaiBody(900),
    })]))

    const after = await (await context()).json()
    expect(after.targetKeyword.term).toBe(second.term)
  })

  it('returns planning data for the generator', async () => {
    await updateCmsSettings(true, clock)
    const body = await track(await ingest([piece({ titleEn: 'Context probe article' })]))

    const response = await context()
    expect(response.status).toBe(200)
    const payload = await response.json()

    expect(payload.autoPublish).toBe(true)
    expect(payload.recentTitles).toContain('Context probe article')
    expect(payload.gapDates.length).toBeLessThanOrEqual(7)
    expect(Array.isArray(payload.keywords)).toBe(true)
    expect(Array.isArray(payload.competitors)).toBe(true)
    expect(body.created).toHaveLength(1)
  })
})

describe('POST /api/cms/ingest with publishNow', () => {
  it('publishes the whole set immediately with exactly one rebuild', async () => {
    let rebuilds = 0
    const local = new Elysia().use(
      createCmsModule({
        triggerRebuild: async () => {
          rebuilds++
        },
        now: () => clock,
        ingestSecret: INGEST_SECRET,
      }),
    )
    const res = await local.handle(
      new Request('http://localhost/api/cms/ingest', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-cms-ingest-secret': INGEST_SECRET },
        body: JSON.stringify({
          pieces: [piece(), piece({ contentType: 'tutorial', bodyMdTh: thaiBody(50), bodyMdEn: englishBody(50) })],
          publishNow: true,
        }),
      }),
    )
    expect(res.status).toBe(201)
    const body = await track(res)
    expect(rebuilds).toBe(1)
    for (const article of body.created) expect(article.status).toBe('published')
    expect(new Set(body.created.map((a: { publishAt: string }) => a.publishAt)).size).toBe(body.created.length)
  })

  it('still schedules into the window when publishNow is absent', async () => {
    await updateCmsSettings(true, clock)
    const body = await track(await ingest([piece()]))
    expect(body.created[0].status).toBe('scheduled')
  })
})
