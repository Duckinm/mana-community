import { db } from '@api/db'
import { accounts } from '@mana/db'
import { eq } from 'drizzle-orm'
import {
  GOOGLE_FETCH_TIMEOUT_MS,
  getValidGoogleAccessToken,
  type GoogleAccountRow,
} from '@api/lib/google/tokens'

import { hasGoogleCalendarScope } from '@mana/db/google-scopes'

export { GOOGLE_CALENDAR_SCOPES, hasGoogleCalendarScope, isGoogleCalendarScope } from '@mana/db/google-scopes'
export { getValidGoogleAccessToken, type GoogleAccountRow } from '@api/lib/google/tokens'

export async function findGoogleCalendarAccounts(userId: string): Promise<GoogleAccountRow[]> {
  const rows = await db
    .select()
    .from(accounts)
    .where(eq(accounts.userId, userId))

  return rows.filter((row) => row.providerId === 'google' && hasGoogleCalendarScope(row.scope))
}

export async function googleCalendarFetchForAccount<T>(
  account: GoogleAccountRow,
  path: string,
  init?: RequestInit,
): Promise<T> {
  const accessToken = await getValidGoogleAccessToken(account)
  const response = await fetch(`https://www.googleapis.com/calendar/v3${path}`, {
    signal: AbortSignal.timeout(GOOGLE_FETCH_TIMEOUT_MS),
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  })

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`Google Calendar API error (${response.status}): ${body}`)
  }

  if (response.status === 204) return undefined as T
  return (await response.json()) as T
}
