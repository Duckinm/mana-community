import { accounts } from '@mana/db'
import { eq } from 'drizzle-orm'
import { db } from '@api/db'
import { env } from '@api/env'

export type GoogleAccountRow = typeof accounts.$inferSelect

/**
 * Bun's fetch has no connect timeout and no IPv4 fallback, so a host with a
 * black-holed IPv6 route to Google leaves the socket in SYN_SENT forever and
 * the request never settles — the client spins on "loading" with no error.
 */
export const GOOGLE_FETCH_TIMEOUT_MS = 10_000

export async function getValidGoogleAccessToken(account: GoogleAccountRow): Promise<string> {
  if (
    account.accessToken &&
    account.accessTokenExpiresAt &&
    account.accessTokenExpiresAt.getTime() > Date.now() + 60_000
  ) {
    return account.accessToken
  }

  if (!account.refreshToken) throw new Error('Google account is missing a refresh token')
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
    throw new Error('Google OAuth is not configured')
  }

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    signal: AbortSignal.timeout(GOOGLE_FETCH_TIMEOUT_MS),
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      refresh_token: account.refreshToken,
      grant_type: 'refresh_token',
    }),
  })

  if (!response.ok) throw new Error(`Google token refresh failed (${response.status})`)

  const payload = (await response.json()) as {
    access_token: string
    expires_in: number
  }
  const expiresAt = new Date(Date.now() + payload.expires_in * 1000)

  // The stored scope is the consent record and gates every Google feature
  // (findGoogleCalendarAccounts). A refresh response may echo a narrower scope
  // than was granted; writing it back silently unlinks the integration.
  await db
    .update(accounts)
    .set({
      accessToken: payload.access_token,
      accessTokenExpiresAt: expiresAt,
      updatedAt: new Date(),
    })
    .where(eq(accounts.id, account.id))

  return payload.access_token
}
