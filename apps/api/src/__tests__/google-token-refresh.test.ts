import { afterAll, expect, test } from 'bun:test'
import { accounts, users } from '@mana/db'
import { eq } from 'drizzle-orm'
import { db } from '@api/db'
import { getValidGoogleAccessToken } from '@api/lib/google/tokens'

const GRANTED =
  'openid https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/calendar.calendarlist.readonly'

const [user] = await db
  .insert(users)
  .values({ name: 'token refresh', email: `token-refresh-${crypto.randomUUID()}@example.com` })
  .returning()

const [account] = await db
  .insert(accounts)
  .values({
    accountId: 'google-sub-1',
    providerId: 'google',
    userId: user.id,
    accessToken: 'stale',
    accessTokenExpiresAt: new Date(0),
    refreshToken: 'refresh-1',
    scope: GRANTED,
  })
  .returning()

const realFetch = globalThis.fetch
afterAll(async () => {
  globalThis.fetch = realFetch
  await db.delete(users).where(eq(users.id, user.id))
})

test('a narrowed refresh response never rewrites the stored scope', async () => {
  globalThis.fetch = (async () =>
    Response.json({
      access_token: 'fresh',
      expires_in: 3600,
      // Google echoing back only part of what was granted is what used to
      // silently unlink the calendar integration.
      scope: 'openid https://www.googleapis.com/auth/calendar.events',
    })) as unknown as typeof fetch

  expect(await getValidGoogleAccessToken(account)).toBe('fresh')

  const [stored] = await db.select().from(accounts).where(eq(accounts.id, account.id))
  expect(stored.accessToken).toBe('fresh')
  expect(stored.scope).toBe(GRANTED)
})
