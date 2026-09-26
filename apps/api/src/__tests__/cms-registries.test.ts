import { afterEach, describe, expect, it, mock } from 'bun:test'
import { cmsCompetitors, cmsKeywords } from '@mana/db'
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
const { readCmsSettings } = await import('@api/modules/cms/registry-service')

const clock = new Date('2026-07-30T05:00:00.000Z')

function app() {
  return new Elysia().use(createCmsModule({ triggerRebuild: async () => {}, now: () => clock }))
}

async function call(path: string, method = 'GET', body?: unknown) {
  return app().handle(
    new Request(`http://localhost/api/cms${path}`, {
      method,
      headers: { 'content-type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
  )
}

const keywordIds: string[] = []
const competitorIds: string[] = []

async function createKeyword(body: Record<string, unknown> = {}) {
  const response = await call('/keywords', 'POST', { term: `freelance invoice ${crypto.randomUUID()}`, ...body })
  expect(response.status).toBe(201)
  const keyword = await response.json()
  keywordIds.push(keyword.id)
  return keyword
}

async function createCompetitor(body: Record<string, unknown> = {}) {
  const response = await call('/competitors', 'POST', {
    name: `Competitor ${crypto.randomUUID()}`,
    url: 'https://example.com',
    ...body,
  })
  expect(response.status).toBe(201)
  const competitor = await response.json()
  competitorIds.push(competitor.id)
  return competitor
}

afterEach(async () => {
  const keywords = keywordIds.splice(0)
  const competitors = competitorIds.splice(0)
  if (keywords.length > 0) await db.delete(cmsKeywords).where(inArray(cmsKeywords.id, keywords))
  if (competitors.length > 0) {
    await db.delete(cmsCompetitors).where(inArray(cmsCompetitors.id, competitors))
  }
})

describe('keyword registry', () => {
  it('creates a keyword with th defaults and lists it', async () => {
    const keyword = await createKeyword({ term: '  ใบแจ้งหนี้ฟรีแลนซ์  ' })

    expect(keyword.term).toBe('ใบแจ้งหนี้ฟรีแลนซ์')
    expect(keyword.locale).toBe('th')
    expect(keyword.priority).toBe(0)

    const listed = await (await call('/keywords')).json()
    expect(listed.keywords.some((row: { id: string }) => row.id === keyword.id)).toBe(true)
  })

  it('orders by priority then term', async () => {
    const low = await createKeyword({ term: 'aaa low', priority: 1 })
    const high = await createKeyword({ term: 'zzz high', priority: 9 })

    const listed = await (await call('/keywords')).json()
    const ids: string[] = listed.keywords.map((row: { id: string }) => row.id)
    expect(ids.indexOf(high.id)).toBeLessThan(ids.indexOf(low.id))
  })

  it('patches and deletes', async () => {
    const keyword = await createKeyword()

    const patched = await (await call(`/keywords/${keyword.id}`, 'PATCH', { priority: 7, locale: 'en' })).json()
    expect(patched.priority).toBe(7)
    expect(patched.locale).toBe('en')

    expect((await call(`/keywords/${keyword.id}`, 'DELETE')).status).toBe(200)
    expect((await call(`/keywords/${keyword.id}`, 'DELETE')).status).toBe(404)
    keywordIds.pop()
  })

  it('rejects an unknown locale', async () => {
    expect((await call('/keywords', 'POST', { term: 'x', locale: 'fr' })).status).toBe(422)
  })
})

describe('competitor registry', () => {
  it('creates with empty notes and patches them', async () => {
    const competitor = await createCompetitor({ name: 'Fastwork Test', url: 'https://fastwork.co' })
    expect(competitor.notes).toBe('')

    const patched = await (
      await call(`/competitors/${competitor.id}`, 'PATCH', { notes: 'marketplace' })
    ).json()
    expect(patched.notes).toBe('marketplace')
  })

  it('deletes and 404s on the second attempt', async () => {
    const competitor = await createCompetitor()
    expect((await call(`/competitors/${competitor.id}`, 'DELETE')).status).toBe(200)
    expect((await call(`/competitors/${competitor.id}`, 'DELETE')).status).toBe(404)
    competitorIds.pop()
  })

  it('requires a url', async () => {
    expect((await call('/competitors', 'POST', { name: 'No URL' })).status).toBe(422)
  })
})

describe('cms settings', () => {
  it('reads the singleton and round-trips the autoPublish toggle', async () => {
    const initial = await (await call('/settings')).json()
    expect(typeof initial.autoPublish).toBe('boolean')

    const off = await (await call('/settings', 'PATCH', { autoPublish: false })).json()
    expect(off.autoPublish).toBe(false)
    expect((await readCmsSettings()).autoPublish).toBe(false)

    const on = await (await call('/settings', 'PATCH', { autoPublish: initial.autoPublish })).json()
    expect(on.autoPublish).toBe(initial.autoPublish)
  })
})
