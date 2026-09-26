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
const { createCmsCronModule } = await import('@api/modules/cms/cron')

const CRON_SECRET = 'test-cron-secret'

let clock = new Date('2026-07-30T05:00:00.000Z')
let rebuildCalls = 0

function app() {
  const deps = {
    triggerRebuild: async () => {
      rebuildCalls++
    },
    now: () => clock,
  }
  return new Elysia()
    .use(createCmsModule(deps))
    .use(createCmsCronModule({ ...deps, cronSecret: CRON_SECRET }))
}

async function post(path: string, body?: unknown, headers: Record<string, string> = {}) {
  return app().handle(
    new Request(`http://localhost${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...headers },
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
  )
}

function tick(headers: Record<string, string> = { 'x-cron-secret': CRON_SECRET }) {
  return post('/api/cron/publish-due', undefined, headers)
}

const createdIds: string[] = []

async function scheduledArticle(publishAt: string) {
  const created = await (
    await post('/api/cms/articles', {
      titleEn: `Publish Due ${crypto.randomUUID()}`,
      bodyMdEn: '# Heading',
    })
  ).json()
  createdIds.push(created.id)

  const scheduled = await (await post(`/api/cms/articles/${created.id}/schedule`, { publishAt })).json()
  expect(scheduled.status).toBe('scheduled')
  return scheduled
}

beforeEach(async () => {
  clock = new Date('2026-07-30T05:00:00.000Z')
  // drain anything already due in this database so counts below are exact
  await tick()
  rebuildCalls = 0
})

afterEach(async () => {
  const ids = createdIds.splice(0)
  if (ids.length > 0) await db.delete(articles).where(inArray(articles.id, ids))
})

describe('POST /api/cron/publish-due', () => {
  it('rejects a missing or wrong cron secret', async () => {
    expect((await tick({})).status).toBe(401)
    expect((await tick({ 'x-cron-secret': 'nope' })).status).toBe(401)
  })

  it('flips every due article, keeps the jittered publishAt, and rebuilds once per tick', async () => {
    const due = [
      await scheduledArticle('2026-07-30T02:03:00.000Z'),
      await scheduledArticle('2026-07-30T02:11:00.000Z'),
      await scheduledArticle('2026-07-30T04:59:00.000Z'),
    ]

    const response = await tick()

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ published: 3 })
    expect(rebuildCalls).toBe(1)

    for (const article of due) {
      const [row] = await db.select().from(articles).where(eq(articles.id, article.id))
      expect(row.status).toBe('published')
      expect(row.publishedAt?.toISOString()).toBe(article.publishAt)
      expect(row.publishAt?.toISOString()).toBe(article.publishAt)
    }
  })

  it('leaves articles whose window has not arrived scheduled', async () => {
    const future = await scheduledArticle('2026-07-31T02:00:00.000Z')

    const response = await tick()

    expect(await response.json()).toEqual({ published: 0 })
    expect(rebuildCalls).toBe(0)

    const [row] = await db.select().from(articles).where(eq(articles.id, future.id))
    expect(row.status).toBe('scheduled')
    expect(row.publishedAt).toBeNull()
  })

  it('skips soft-deleted scheduled articles', async () => {
    const deleted = await scheduledArticle('2026-07-30T02:00:00.000Z')
    await app().handle(
      new Request(`http://localhost/api/cms/articles/${deleted.id}`, { method: 'DELETE' }),
    )

    const response = await tick()

    expect(await response.json()).toEqual({ published: 0 })
    expect(rebuildCalls).toBe(0)

    const [row] = await db.select().from(articles).where(eq(articles.id, deleted.id))
    expect(row.status).toBe('scheduled')
    expect(row.deletedAt).not.toBeNull()
  })

  it('is a no-op on a tick with nothing due', async () => {
    const response = await tick()

    expect(await response.json()).toEqual({ published: 0 })
    expect(rebuildCalls).toBe(0)
  })

  it('publishes a batch scheduled by the publish window once its slots pass', async () => {
    const created = await (
      await post('/api/cms/articles', { titleEn: `Window ${crypto.randomUUID()}`, bodyMdEn: '# H' })
    ).json()
    createdIds.push(created.id)
    const scheduled = await (await post(`/api/cms/articles/${created.id}/schedule`)).json()

    expect(await (await tick()).json()).toEqual({ published: 0 })

    clock = new Date(new Date(scheduled.publishAt).getTime() + 60_000)
    expect(await (await tick()).json()).toEqual({ published: 1 })
    expect(rebuildCalls).toBe(1)
  })
})
